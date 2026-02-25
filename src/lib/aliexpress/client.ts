/**
 * AliExpressHybridClient — Camada de API híbrida para dados de produtos.
 *
 * Fonte PRIMÁRIA: Omkarcloud AliExpress Scraper API
 *   - Sem necessidade de aprovação oficial
 *   - 5.000 req/mês no plano gratuito
 *
 * Fonte SECUNDÁRIA: ae_sdk (AffiliateClient / DropshipperClient)
 *   - Para links de afiliado e pedidos quando credenciais disponíveis
 *
 * Fonte TERCIÁRIA: Cache no banco (Prisma)
 *   - Fallback quando ambas as APIs falham
 */

import { prisma } from "@/lib/prisma";
import { getAffiliateClient, getDropshipperClient, getTrackingId, withRetry } from "./clients";
import type {
  OmkarProductData,
  OmkarSearchResult,
  OmkarSearchItem,
  HybridProductData,
  HybridSearchResult,
} from "./types";

// ---------------------------------------------------------------------------
// Constantes e configuração
// ---------------------------------------------------------------------------

const OMKAR_BASE_URL = "https://aliexpress-scraper-api.omkar.cloud/aliexpress-scraper";

function getOmkarApiKey(): string {
  return process.env.OMKAR_API_KEY ?? "";
}

function isOmkarConfigured(): boolean {
  return !!getOmkarApiKey();
}

// ---------------------------------------------------------------------------
// Controle de uso mensal da API Omkar (rate limiting)
// ---------------------------------------------------------------------------

async function getMonthlyUsage(): Promise<number> {
  const month = new Date().toISOString().slice(0, 7); // "2026-02"
  const usage = await prisma.apiUsage.findFirst({
    where: { service: "omkar", month },
  });
  return usage?.requestCount ?? 0;
}

async function incrementUsage(): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  await prisma.apiUsage.upsert({
    where: { service_month: { service: "omkar", month } },
    update: { requestCount: { increment: 1 } },
    create: { service: "omkar", month, requestCount: 1 },
  });
}

async function canMakeRequest(): Promise<boolean> {
  const limit = parseInt(process.env.OMKAR_MONTHLY_LIMIT ?? "5000", 10);
  const usage = await getMonthlyUsage();
  return usage < limit;
}

// ---------------------------------------------------------------------------
// Classe principal do client híbrido
// ---------------------------------------------------------------------------

export class AliExpressHybridClient {
  // =========================================================================
  // BUSCA DE PRODUTO POR ID
  // =========================================================================

  /**
   * Busca dados completos de um produto pelo ID do AliExpress.
   * Fluxo: Omkar → ae_sdk → Cache Prisma
   */
  async getProduct(productId: string): Promise<HybridProductData | null> {
    // Tentativa 1: Omkar Scraper API (fonte primária)
    const omkarData = await this.getProductFromOmkar(productId);
    if (omkarData) {
      return this.normalizeOmkarProduct(omkarData);
    }

    // Tentativa 2: ae_sdk DropshipperClient (fonte secundária)
    const sdkData = await this.getProductFromSdk(productId);
    if (sdkData) {
      return sdkData;
    }

    // Tentativa 3: Cache no banco (fonte terciária)
    const cached = await this.getProductFromCache(productId);
    if (cached) {
      return cached;
    }

    // Tentativa 4: Scraper HTML direto (último recurso)
    return this.getProductFromHtmlScraper(productId);
  }

  /**
   * Busca produtos por palavra-chave.
   * Fluxo: Omkar → ae_sdk → vazio
   */
  async searchProducts(query: string, page = 1): Promise<HybridSearchResult> {
    // Tentativa 1: Omkar
    const omkarResults = await this.searchFromOmkar(query);
    if (omkarResults && omkarResults.length > 0) {
      return {
        items: omkarResults.map((item) => this.normalizeOmkarSearchItem(item)),
        total: omkarResults.length,
        page,
        source: "omkar",
      };
    }

    // Tentativa 2: ae_sdk AffiliateClient
    const sdkResults = await this.searchFromSdk(query, page);
    if (sdkResults) {
      return sdkResults;
    }

    // Nenhuma fonte disponível
    return { items: [], total: 0, page, source: "none" };
  }

  /**
   * Gera link de afiliado para um produto (monetização extra).
   * Usa ae_sdk AffiliateClient.
   */
  async generateAffiliateLink(productUrl: string): Promise<string> {
    const client = getAffiliateClient();
    const trackingId = getTrackingId();

    if (!client || !trackingId) return productUrl;

    try {
      const result = await withRetry(() =>
        client.generateAffiliateLinks({
          promotion_link_type: 0,
          source_values: productUrl,
          tracking_id: trackingId,
        }),
      );

      if (!result.ok) return productUrl;

      const data = result.data as unknown as Record<string, unknown>;
      const links = data.promotion_links as Record<string, unknown>[] | undefined;

      if (links && links.length > 0) {
        const promoUrl = links[0].promotion_link as string | undefined;
        if (promoUrl) return promoUrl;
      }
    } catch (error) {
      console.error("[HybridClient] Erro ao gerar link de afiliado:", error);
    }

    return productUrl;
  }

  /**
   * Retorna o uso atual da API Omkar para exibir no admin.
   */
  async getApiUsageStats(): Promise<{ used: number; limit: number; percentage: number }> {
    const limit = parseInt(process.env.OMKAR_MONTHLY_LIMIT ?? "5000", 10);
    const used = await getMonthlyUsage();
    return {
      used,
      limit,
      percentage: Math.round((used / limit) * 100),
    };
  }

  // =========================================================================
  // FONTE PRIMÁRIA: Omkar Scraper API
  // =========================================================================

  private async getProductFromOmkar(productId: string): Promise<OmkarProductData | null> {
    if (!isOmkarConfigured()) return null;
    if (!(await canMakeRequest())) {
      console.warn("[HybridClient] Limite mensal Omkar atingido");
      return null;
    }

    try {
      const url = `${OMKAR_BASE_URL}/product?product_id=${encodeURIComponent(productId)}`;
      const response = await fetch(url, {
        headers: {
          "API-Key": getOmkarApiKey(),
          "Content-Type": "application/json",
        },
        next: { revalidate: 14400 }, // Cache 4h no Next.js
      } as RequestInit);

      if (!response.ok) {
        console.error(`[Omkar] Erro HTTP ${response.status} ao buscar produto ${productId}`);
        return null;
      }

      await incrementUsage();
      const data = await response.json() as OmkarProductData;
      return data;
    } catch (error) {
      console.error("[Omkar] Erro ao buscar produto:", error);
      return null;
    }
  }

  private async searchFromOmkar(query: string): Promise<OmkarSearchItem[] | null> {
    if (!isOmkarConfigured()) return null;
    if (!(await canMakeRequest())) {
      console.warn("[HybridClient] Limite mensal Omkar atingido");
      return null;
    }

    try {
      const url = `${OMKAR_BASE_URL}/search?query=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          "API-Key": getOmkarApiKey(),
          "Content-Type": "application/json",
        },
        next: { revalidate: 14400 },
      } as RequestInit);

      if (!response.ok) {
        console.error(`[Omkar] Erro HTTP ${response.status} na busca: "${query}"`);
        return null;
      }

      await incrementUsage();
      const data = await response.json() as OmkarSearchResult;

      // A resposta pode ser um array direto ou um objeto com campo results
      if (Array.isArray(data)) return data as unknown as OmkarSearchItem[];
      if (data.results) return data.results;
      if (data.products) return data.products;

      return null;
    } catch (error) {
      console.error("[Omkar] Erro na busca:", error);
      return null;
    }
  }

  // =========================================================================
  // FONTE SECUNDÁRIA: ae_sdk
  // =========================================================================

  private async getProductFromSdk(productId: string): Promise<HybridProductData | null> {
    const client = getDropshipperClient();
    if (!client) return null;

    try {
      const result = await withRetry(() =>
        client.productDetails({
          product_id: Number(productId),
          ship_to_country: "BR",
          target_currency: "USD",
          target_language: "PT",
        }),
      );

      if (!result.ok) return null;

      const raw = result.data as unknown as Record<string, unknown>;
      return this.normalizeSdkProduct(raw, productId);
    } catch (error) {
      console.error("[ae_sdk] Erro ao buscar produto:", error);
      return null;
    }
  }

  private async searchFromSdk(query: string, page: number): Promise<HybridSearchResult | null> {
    const client = getAffiliateClient();
    const trackingId = getTrackingId();
    if (!client || !trackingId) return null;

    try {
      const result = await withRetry(() =>
        client.queryProducts({
          keywords: query,
          page_no: String(page),
          page_size: "20",
          target_currency: "USD",
          target_language: "PT",
          ship_to_country: "BR",
          tracking_id: trackingId,
          sort: "LAST_VOLUME_DESC",
        } as Parameters<typeof client.queryProducts>[0]),
      );

      if (!result.ok) return null;

      const data = result.data as unknown as Record<string, unknown>;
      const products = (data.products as Record<string, unknown>[]) ?? [];
      const total = (data.total_record_count as number) ?? 0;

      const items: HybridProductData[] = products.map((p) => ({
        productId: String(p.product_id ?? ""),
        title: (p.product_title as string) ?? "",
        description: "",
        images: this.extractSdkImages(p),
        priceUSD: parseFloat(((p.target_sale_price as string) ?? "0").replace(/[^0-9.]/g, "")),
        originalPriceUSD: parseFloat(((p.target_original_price as string) ?? "0").replace(/[^0-9.]/g, "")),
        rating: parseFloat(((p.evaluate_rate as string) ?? "0").replace("%", "")) / 20,
        reviewCount: 0,
        ordersCount: (p.lastest_volume as number) ?? 0,
        stock: 100,
        variations: [],
        sellerInfo: null,
        productUrl: (p.product_detail_url as string) ?? `https://www.aliexpress.com/item/${p.product_id}.html`,
        source: "ae_sdk" as const,
      }));

      return { items, total, page, source: "ae_sdk" };
    } catch (error) {
      console.error("[ae_sdk] Erro na busca:", error);
      return null;
    }
  }

  // =========================================================================
  // FONTE TERCIÁRIA: Cache Prisma
  // =========================================================================

  private async getProductFromCache(productId: string): Promise<HybridProductData | null> {
    try {
      const product = await prisma.product.findFirst({
        where: { aliexpressId: productId },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variations: true,
        },
      });

      if (!product) return null;

      // Se temos dados brutos do Omkar salvos, usar eles
      if (product.omkarProductData) {
        const cached = product.omkarProductData as unknown as OmkarProductData;
        return this.normalizeOmkarProduct(cached);
      }

      // Caso contrário, construir a partir dos dados do banco
      return {
        productId,
        title: product.title,
        description: product.description ?? "",
        images: product.images.map((img) => img.url),
        priceUSD: product.costPriceUSD ? Number(product.costPriceUSD) : Number(product.costPrice ?? 0) / 5.5,
        originalPriceUSD: 0,
        rating: 0,
        reviewCount: 0,
        ordersCount: product.salesCount,
        stock: product.stock,
        variations: product.variations.map((v) => ({
          name: v.name,
          value: v.value,
          stock: v.stock,
          sku: v.sku ?? undefined,
          image: v.image ?? undefined,
          priceUSD: v.price ? Number(v.price) / 5.5 : undefined,
        })),
        sellerInfo: null,
        productUrl: product.aliexpressUrl ?? "",
        source: "cache",
      };
    } catch (error) {
      console.error("[Cache] Erro ao buscar produto do banco:", error);
      return null;
    }
  }

  // =========================================================================
  // Normalização de dados
  // =========================================================================

  private normalizeOmkarProduct(data: OmkarProductData): HybridProductData {
    const images: string[] = [];

    // Extrair imagens do Omkar (vários formatos possíveis)
    if (data.images && Array.isArray(data.images)) {
      images.push(...data.images.filter(Boolean));
    }
    if (data.imagePathList && Array.isArray(data.imagePathList)) {
      images.push(...data.imagePathList.filter(Boolean));
    }
    if (data.mainImage && !images.includes(data.mainImage)) {
      images.unshift(data.mainImage);
    }

    // Normalizar URLs de imagem (adicionar https: se necessário)
    const normalizedImages = images
      .map((img) => (img.startsWith("//") ? `https:${img}` : img))
      .filter((img) => img.length > 10);

    // Extrair preço
    let priceUSD = 0;
    if (data.price) {
      priceUSD = typeof data.price === "number" ? data.price : parseFloat(String(data.price));
    } else if (data.salePrice) {
      priceUSD = typeof data.salePrice === "number" ? data.salePrice : parseFloat(String(data.salePrice));
    } else if (data.minPrice) {
      priceUSD = typeof data.minPrice === "number" ? data.minPrice : parseFloat(String(data.minPrice));
    }

    let originalPriceUSD = 0;
    if (data.originalPrice) {
      originalPriceUSD = typeof data.originalPrice === "number"
        ? data.originalPrice
        : parseFloat(String(data.originalPrice));
    }

    // Extrair variantes
    const variations: HybridProductData["variations"] = [];
    if (data.skuList && Array.isArray(data.skuList)) {
      for (const sku of data.skuList) {
        variations.push({
          name: sku.skuPropertyName ?? sku.name ?? "Variação",
          value: sku.skuPropertyValue ?? sku.value ?? "",
          stock: sku.stock ?? sku.availQuantity ?? 0,
          sku: sku.skuId ?? sku.skuAttr ?? undefined,
          image: sku.image ?? sku.skuImage ?? undefined,
          priceUSD: sku.price ? parseFloat(String(sku.price)) : undefined,
        });
      }
    }
    if (data.variations && Array.isArray(data.variations)) {
      for (const v of data.variations) {
        if (v.values && Array.isArray(v.values)) {
          for (const val of v.values) {
            variations.push({
              name: v.name ?? "Variação",
              value: val.name ?? val.label ?? val.value ?? "",
              stock: val.stock ?? val.availQuantity ?? 0,
              sku: val.skuId ?? val.skuAttr ?? undefined,
              image: val.image ?? undefined,
              priceUSD: val.price ? parseFloat(String(val.price)) : undefined,
            });
          }
        }
      }
    }

    // Info do vendedor
    const sellerInfo = data.seller
      ? {
          name: data.seller.storeName ?? data.seller.name ?? "",
          rating: data.seller.rating ?? data.seller.positiveRate ?? 0,
          storeUrl: data.seller.storeUrl ?? "",
        }
      : null;

    return {
      productId: String(data.product_id ?? data.productId ?? data.id ?? ""),
      title: data.title ?? data.subject ?? "",
      description: data.description ?? data.detail ?? "",
      images: normalizedImages,
      priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
      originalPriceUSD: isNaN(originalPriceUSD) ? 0 : originalPriceUSD,
      rating: data.rating ?? data.averageRating ?? data.avgEvaluationRating ?? 0,
      reviewCount: data.reviewCount ?? data.evaluationCount ?? 0,
      ordersCount: data.ordersCount ?? data.orders ?? data.salesCount ?? 0,
      stock: data.stock ?? data.totalStock ?? data.totalAvailQuantity ?? 0,
      variations,
      sellerInfo,
      productUrl: data.productUrl ?? `https://www.aliexpress.com/item/${data.product_id ?? data.productId ?? data.id}.html`,
      source: "omkar",
    };
  }

  private normalizeOmkarSearchItem(item: OmkarSearchItem): HybridProductData {
    const images: string[] = [];
    if (item.image) images.push(item.image.startsWith("//") ? `https:${item.image}` : item.image);
    if (item.mainImage) images.push(item.mainImage.startsWith("//") ? `https:${item.mainImage}` : item.mainImage);
    if (item.images && Array.isArray(item.images)) {
      images.push(...item.images.map((img) => (img.startsWith("//") ? `https:${img}` : img)));
    }

    const priceUSD = typeof item.price === "number"
      ? item.price
      : parseFloat(String(item.price ?? item.salePrice ?? 0));

    return {
      productId: String(item.product_id ?? item.productId ?? item.id ?? ""),
      title: item.title ?? "",
      description: "",
      images: [...new Set(images)].filter(Boolean),
      priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
      originalPriceUSD: typeof item.originalPrice === "number"
        ? item.originalPrice
        : parseFloat(String(item.originalPrice ?? 0)) || 0,
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount ?? 0,
      ordersCount: item.orders ?? item.ordersCount ?? 0,
      stock: item.stock ?? 100,
      variations: [],
      sellerInfo: null,
      productUrl: item.productUrl ?? `https://www.aliexpress.com/item/${item.product_id ?? item.productId ?? item.id}.html`,
      source: "omkar",
    };
  }

  private normalizeSdkProduct(raw: Record<string, unknown>, productId: string): HybridProductData {
    // Extrair imagens do SDK
    const multimedia = raw.ae_multimedia_info_dto as Record<string, unknown> | undefined;
    const imageList = (multimedia?.image_urls as string) ?? "";
    const images = imageList.split(",").map((u: string) => u.trim()).filter(Boolean);

    // Extrair preço mínimo dos SKUs
    const skuModule = raw.ae_item_sku_info_dtos as Record<string, unknown> | undefined;
    const skus = (skuModule?.ae_item_sku_info_d_t_o as Record<string, unknown>[]) ?? [];

    let minPriceUsd = Infinity;
    for (const sku of skus) {
      const offer = sku.offer_sale_price
        ? parseFloat(sku.offer_sale_price as string)
        : parseFloat((sku.sku_price as string) ?? "0");
      if (offer < minPriceUsd) minPriceUsd = offer;
    }
    if (minPriceUsd === Infinity) {
      minPriceUsd = parseFloat((raw.sku_price as string) ?? "0");
    }

    // Extrair variantes
    const propModule = raw.ae_item_properties as Record<string, unknown> | undefined;
    const props = (propModule?.ae_item_property as Record<string, unknown>[]) ?? [];
    const variations: HybridProductData["variations"] = props.map((prop) => ({
      name: (prop.attr_name as string) ?? "",
      value: (prop.attr_value as string) ?? "",
      stock: 0,
      sku: (prop.sku_property_value as string) ?? undefined,
      image: (prop.property_value_definition_name as string) || undefined,
    }));

    return {
      productId,
      title: (raw.subject as string) ?? (raw.product_title as string) ?? "",
      description: (raw.detail as string) ?? "",
      images,
      priceUSD: isNaN(minPriceUsd) ? 0 : minPriceUsd,
      originalPriceUSD: 0,
      rating: parseFloat((raw.avg_evaluation_rating as string) ?? "0"),
      reviewCount: (raw.evaluation_count as number) ?? 0,
      ordersCount: (raw.order_count as number) ?? 0,
      stock: (raw.product_stock as number) ?? 0,
      variations,
      sellerInfo: null,
      productUrl: `https://www.aliexpress.com/item/${productId}.html`,
      source: "ae_sdk",
    };
  }

  private extractSdkImages(raw: Record<string, unknown>): string[] {
    const images: string[] = [];
    const mainImg = raw.product_main_image_url as string | undefined;
    if (mainImg) images.push(mainImg);

    const smallImgs = raw.product_small_image_urls as Record<string, string[]> | string[] | undefined;
    if (Array.isArray(smallImgs)) {
      images.push(...smallImgs);
    } else if (smallImgs && typeof smallImgs === "object") {
      const arr = (smallImgs as Record<string, string[]>).string ?? [];
      images.push(...arr);
    }

    return [...new Set(images)];
  }

  // =========================================================================
  // FONTE QUATERNÁRIA: Scraper HTML direto (último recurso)
  // =========================================================================

  private async getProductFromHtmlScraper(productId: string): Promise<HybridProductData | null> {
    console.log(`[HtmlScraper] Tentando scraper HTML direto para ${productId}...`);

    const urlVariants = [
      `https://www.aliexpress.com/item/${productId}.html`,
      `https://pt.aliexpress.com/item/${productId}.html`,
      `https://m.aliexpress.com/item/${productId}.html`,
    ];

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Encoding": "identity",
    };

    let html = "";
    for (const tryUrl of urlVariants) {
      try {
        const res = await fetch(tryUrl, { headers, redirect: "follow" });
        if (res.ok) {
          const text = await res.text();
          if (text.includes("alicdn.com") || text.includes("imagePathList") || text.includes("og:title")) {
            html = text;
            break;
          }
        }
      } catch { /* next */ }
    }

    if (!html) return null;

    // Extract title
    let title = "";
    const titlePatterns = [
      /property="og:title"\s+content="([^"]+)"/,
      /content="([^"]+)"\s+property="og:title"/,
      /"subject"\s*:\s*"([^"]+)"/,
      /"title"\s*:\s*"([^"]{10,200})"/,
      /<title[^>]*>([^<]+)<\/title>/i,
    ];
    for (const p of titlePatterns) {
      const m = html.match(p);
      if (m && m[1].length > 5) {
        title = m[1].replace(/\s*[-|].*AliExpress.*$/i, "").replace(/\s*-\s*Compre.*$/i, "").trim();
        if (title.length > 5) break;
      }
    }

    // Extract images
    const images: string[] = [];
    const imgListMatch = html.match(/"imagePathList"\s*:\s*(\["[^"]*"(?:\s*,\s*"[^"]*")*\])/);
    if (imgListMatch) {
      try {
        const imgUrls = JSON.parse(imgListMatch[1]) as string[];
        images.push(...imgUrls.map((u) => (u.startsWith("//") ? `https:${u}` : u)));
      } catch { /* */ }
    }
    if (images.length === 0) {
      const kfPattern = /https?:\/\/ae\d+\.alicdn\.com\/kf\/[A-Za-z0-9]+\.(jpg|jpeg|png|webp)/gi;
      const seen = new Set<string>();
      for (const m of html.matchAll(kfPattern)) {
        if (!seen.has(m[0]) && !m[0].includes("_80x80") && !m[0].includes("_50x50")) {
          seen.add(m[0]);
          images.push(m[0]);
        }
        if (seen.size >= 6) break;
      }
    }
    if (images.length === 0) {
      const ogImgMatch = html.match(/property="og:image"\s+content="([^"]+)"/) || html.match(/content="([^"]+)"\s+property="og:image"/);
      if (ogImgMatch) images.push(ogImgMatch[1].startsWith("//") ? `https:${ogImgMatch[1]}` : ogImgMatch[1]);
    }

    // Extract price
    let priceUSD = 0;
    const pricePatterns = [
      /"formatedAmount"\s*:\s*"(?:US\s*\$|R\$)\s*([\d.,]+)"/,
      /"minAmount"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
      /"minPrice"\s*:\s*"([\d.]+)"/,
      /property="product:price:amount"\s+content="([\d.]+)"/,
    ];
    for (const p of pricePatterns) {
      const m = html.match(p);
      if (m) {
        priceUSD = parseFloat(m[1].replace(",", "."));
        if (priceUSD > 0) break;
      }
    }

    // Extract description
    let description = "";
    const descPatterns = [
      /property="og:description"\s+content="([^"]+)"/,
      /content="([^"]+)"\s+property="og:description"/,
    ];
    for (const p of descPatterns) {
      const m = html.match(p);
      if (m && m[1].length > 10) { description = m[1].trim(); break; }
    }

    if (!title && images.length === 0) return null;

    return {
      productId,
      title: title || `Produto AliExpress ${productId}`,
      description,
      images,
      priceUSD,
      originalPriceUSD: 0,
      rating: 0,
      reviewCount: 0,
      ordersCount: 0,
      stock: 50,
      variations: [],
      sellerInfo: null,
      productUrl: `https://www.aliexpress.com/item/${productId}.html`,
      source: "scraper" as "omkar",
    };
  }
}

// Singleton
let _hybridClient: AliExpressHybridClient | null = null;

export function getHybridClient(): AliExpressHybridClient {
  if (!_hybridClient) {
    _hybridClient = new AliExpressHybridClient();
  }
  return _hybridClient;
}
