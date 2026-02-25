/**
 * Transformador de dados: converte dados do HybridClient → schema Prisma.
 *
 * Responsável por:
 * - Tradução automática de títulos (Google Translate free tier)
 * - Conversão de preço USD → BRL com margem
 * - Download e rehost de imagens no Vercel Blob
 * - Geração de slug, detecção de categoria, mapeamento de variantes
 */

import { slugify } from "@/lib/utils";
import { uploadToStorage } from "@/lib/storage";
import { calculateFinalPrice, calculateCompareAtPrice } from "@/lib/pricing/calculator";
import { getUsdToBrlRate } from "./clients";
import type { HybridProductData } from "./types";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos para o resultado da transformação
// ---------------------------------------------------------------------------

export interface TransformedProduct {
  data: Prisma.ProductCreateInput;
  images: { url: string; alt: string; sortOrder: number }[];
  variations: { name: string; value: string; stock: number; sku: string | null; image: string | null; price: Prisma.Decimal | null }[];
  meta: {
    costPriceUSD: number;
    exchangeRate: number;
    source: string;
    needsTranslation: boolean;
  };
}

// ---------------------------------------------------------------------------
// Mapa de categorias por keywords no título
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "roupas": ["body", "bodysuit", "romper", "dress", "vestido", "macacão", "pijama", "pajama", "shirt", "camiseta", "pants", "calça", "shorts", "jacket", "jaqueta", "coat", "casaco", "sweater", "blusa", "socks", "meia", "hat", "chapéu", "bonnet", "touca", "outfit", "conjunto", "roupa", "clothes", "clothing", "onesie"],
  "brinquedos": ["toy", "brinquedo", "rattle", "chocalho", "teether", "mordedor", "puzzle", "mobile", "plush", "pelúcia", "doll", "boneca", "block", "bloco", "musical", "educativo", "educational", "play", "brincar", "game"],
  "higiene": ["bath", "banho", "shampoo", "soap", "sabonete", "towel", "toalha", "diaper", "fralda", "wipe", "lenço", "brush", "escova", "comb", "pente", "thermometer", "termômetro", "nail", "unha", "potty", "troninho"],
  "alimentacao": ["bottle", "mamadeira", "cup", "copo", "plate", "prato", "spoon", "colher", "fork", "garfo", "bib", "babador", "feeding", "alimentação", "sippy", "bowl", "tigela", "food", "comida", "snack"],
  "acessorios": ["bag", "bolsa", "backpack", "mochila", "stroller", "carrinho", "blanket", "manta", "cobertor", "pillow", "travesseiro", "organizer", "organizador", "holder", "clip", "presilha", "headband", "faixa", "bow", "laço", "ribbon", "fita"],
  "seguranca": ["monitor", "gate", "portão", "lock", "trava", "protector", "protetor", "safety", "segurança", "guard", "camera", "babá eletrônica"],
  "decoracao": ["decor", "decoração", "wall", "parede", "frame", "quadro", "lamp", "luminária", "light", "luz", "rug", "tapete", "curtain", "cortina", "sticker", "adesivo"],
  "cama-berco": ["bed", "cama", "crib", "berço", "mattress", "colchão", "sheet", "lençol", "bumper", "protetor", "mosquito", "mosquiteiro", "nest", "ninho", "sleeping"],
};

/**
 * Detecta a categoria mais provável baseado em keywords no título.
 */
export function detectCategory(title: string): string {
  const titleLower = title.toLowerCase();
  let bestCategory = "acessorios"; // padrão
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Tenta traduzir o título usando Google Translate (free tier).
 * Se falhar, retorna o título original com flag needsTranslation.
 */
async function translateTitle(title: string): Promise<{ translated: string; needsTranslation: boolean }> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(title)}`;
    const response = await fetch(url);

    if (!response.ok) {
      return { translated: title, needsTranslation: true };
    }

    const data = await response.json() as [[[string]]];
    const translated = data?.[0]?.map((item: [string]) => item[0]).join("") ?? title;

    // Se a tradução parece válida (diferente do original e tem tamanho razoável)
    if (translated && translated !== title && translated.length > 3) {
      return { translated, needsTranslation: false };
    }

    return { translated: title, needsTranslation: true };
  } catch {
    return { translated: title, needsTranslation: true };
  }
}

/**
 * Baixa e re-hospeda uma imagem no Vercel Blob.
 * Retorna a URL final (Blob ou original como fallback).
 */
async function rehostImage(imageUrl: string): Promise<string> {
  try {
    let finalUrl = imageUrl;
    if (finalUrl.startsWith("//")) {
      finalUrl = `https:${finalUrl}`;
    }

    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/*",
        Referer: "https://www.aliexpress.com/",
      },
    });

    if (!res.ok) return finalUrl;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 1024) return finalUrl;

    const blobUrl = await uploadToStorage(buffer, contentType, ext);
    return blobUrl ?? finalUrl;
  } catch {
    return imageUrl;
  }
}

/**
 * Transforma dados do HybridClient no formato Prisma para criação de produto.
 */
export async function transformToProduct(
  source: HybridProductData,
  options: {
    markupMultiplier?: number;
    categoryId?: string | null;
    maxImages?: number;
    rehostImages?: boolean;
  } = {},
): Promise<TransformedProduct> {
  const {
    markupMultiplier = parseFloat(process.env.MARKUP_MULTIPLIER ?? "2.5"),
    categoryId = null,
    maxImages = 5,
    rehostImages = true,
  } = options;

  // 1. Taxa de câmbio atual
  const exchangeRate = await getUsdToBrlRate();

  // 2. Traduzir título
  const { translated: title, needsTranslation } = await translateTitle(source.title);

  // 3. Calcular preços usando o motor de precificação
  const priceResult = calculateFinalPrice(source.priceUSD, exchangeRate, { markupMultiplier });
  const compareAtPrice = calculateCompareAtPrice(priceResult.finalPrice);

  // 4. Processar imagens (limitar a maxImages, re-hospedar se configurado)
  const imageUrls = source.images.slice(0, maxImages);
  let processedImages: { url: string; alt: string; sortOrder: number }[];

  if (rehostImages && imageUrls.length > 0) {
    const rehostPromises = imageUrls.map(async (url, index) => {
      const rehostedUrl = await rehostImage(url);
      return {
        url: rehostedUrl,
        alt: `${title} - Imagem ${index + 1}`,
        sortOrder: index,
      };
    });
    processedImages = await Promise.all(rehostPromises);
  } else {
    processedImages = imageUrls.map((url, index) => ({
      url: url.startsWith("//") ? `https:${url}` : url,
      alt: `${title} - Imagem ${index + 1}`,
      sortOrder: index,
    }));
  }

  // Fallback se não tem imagens
  if (processedImages.length === 0) {
    processedImages = [{
      url: "https://placehold.co/800x800/FFB6C1/333333?text=Sem+Imagem",
      alt: title,
      sortOrder: 0,
    }];
  }

  // 5. Gerar slug único
  const baseSlug = slugify(title);
  const slug = baseSlug || `produto-${source.productId}`;

  // 6. Mapear variantes para formato Prisma
  const variations = source.variations.map((v) => ({
    name: v.name,
    value: v.value,
    stock: v.stock,
    sku: v.sku ?? null,
    image: v.image ?? null,
    price: v.priceUSD
      ? new Prisma.Decimal(calculateFinalPrice(v.priceUSD, exchangeRate, { markupMultiplier }).finalPrice)
      : null,
  }));

  // 7. Calcular estoque total
  const totalStock = variations.length > 0
    ? variations.reduce((sum, v) => sum + v.stock, 0)
    : source.stock || 50;

  // 8. Descrição curta
  const description = source.description || "Produto importado com qualidade garantida. Confira as imagens e detalhes.";
  const shortDescription = description.substring(0, 150) + (description.length > 150 ? "..." : "");

  // 9. Detectar categoria se não fornecida
  const detectedCategorySlug = categoryId ? undefined : detectCategory(source.title);

  // 10. Montar dados do Prisma
  const productData: Prisma.ProductCreateInput = {
    title,
    slug,
    description,
    shortDescription,
    price: new Prisma.Decimal(priceResult.finalPrice),
    compareAtPrice: new Prisma.Decimal(compareAtPrice),
    costPrice: new Prisma.Decimal(priceResult.costBRL),
    stock: totalStock,
    isActive: false,
    isDraft: true,
    aliexpressUrl: source.productUrl,
    aliexpressId: source.productId,
    aliexpressProductId: source.productId,
    costPriceUSD: source.priceUSD,
    exchangeRateAtImport: exchangeRate,
    syncPrice: true,
    outOfStock: totalStock === 0,
    omkarProductData: source as unknown as Prisma.InputJsonValue,
    profitMargin: new Prisma.Decimal(markupMultiplier * 100 - 100),
    autoSync: true,
    metaTitle: `${title} | Frete Grátis | Fofurinhas Baby`,
    metaDescription: shortDescription.substring(0, 155),
    ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
  };

  return {
    data: productData,
    images: processedImages,
    variations,
    meta: {
      costPriceUSD: source.priceUSD,
      exchangeRate,
      source: source.source,
      needsTranslation,
    },
  };
}

/**
 * Detecta a categoria slug e tenta encontrar no banco.
 * Retorna o categoryId ou null.
 */
export async function findOrDetectCategory(
  title: string,
  prismaClient: { category: { findFirst: (args: { where: { slug: { contains: string; mode: "insensitive" } }; select: { id: true } }) => Promise<{ id: string } | null> } },
): Promise<string | null> {
  const categorySlug = detectCategory(title);

  try {
    const category = await prismaClient.category.findFirst({
      where: { slug: { contains: categorySlug, mode: "insensitive" } },
      select: { id: true },
    });
    return category?.id ?? null;
  } catch {
    return null;
  }
}
