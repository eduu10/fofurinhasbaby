/**
 * Script de importação em lote de produtos do AliExpress.
 *
 * Uso: npm run import:batch
 *
 * Busca os top 20 produtos por keyword no Omkar Scraper API,
 * filtra por qualidade (rating >= 4.5, orders >= 50, price <= USD 15),
 * e importa automaticamente para o banco como rascunho.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const OMKAR_BASE_URL = "https://aliexpress-scraper-api.omkar.cloud/aliexpress-scraper";

/** Palavras-chave focadas no nicho de bebês */
const BABY_KEYWORDS = [
  "baby bodysuit cotton",
  "baby teether silicone",
  "baby rattle toy",
  "baby bath toy",
  "baby bib waterproof",
  "baby socks cotton",
  "baby headband bow",
  "baby blanket soft",
  "baby bottle holder",
  "baby hair clips set",
  "baby shoes soft sole",
  "baby romper cotton",
  "baby diaper bag organizer",
  "baby pacifier clip",
  "baby sleeping bag",
];

/** Filtros de qualidade para importação automática */
const QUALITY_FILTERS = {
  minRating: 4.5,
  minOrders: 50,
  maxPriceUSD: 15,
};

/** Margem padrão de markup */
const DEFAULT_MARKUP = 2.5;

// ---------------------------------------------------------------------------
// Tipos (inline para não depender de compilação TS avançada)
// ---------------------------------------------------------------------------

interface SearchItem {
  product_id?: string;
  productId?: string;
  id?: string;
  title?: string;
  image?: string;
  mainImage?: string;
  images?: string[];
  price?: number | string;
  salePrice?: number | string;
  originalPrice?: number | string;
  rating?: number;
  reviewCount?: number;
  orders?: number;
  ordersCount?: number;
  stock?: number;
  productUrl?: string;
}

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------

async function fetchExchangeRate(): Promise<number> {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
    const json = await res.json();
    return parseFloat(json.USDBRL?.bid ?? "5.5");
  } catch {
    return 5.5;
  }
}

function psychologicalRounding(value: number): number {
  if (value <= 0) return 0;
  const intPart = Math.floor(value);
  const decPart = value - intPart;

  if (value <= 30) {
    return decPart <= 0.9 ? intPart + 0.9 : intPart + 1 + 0.9;
  }

  if (decPart <= 0.45) return intPart + 0.9;
  if (decPart <= 0.95) return intPart + 0.99;
  return intPart + 1 + 0.9;
}

async function translateTitle(title: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    if (!response.ok) return title;
    const data = await response.json();
    const translated = data?.[0]?.map((item: [string]) => item[0]).join("") ?? title;
    return translated && translated.length > 3 ? translated : title;
  } catch {
    return title;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ---------------------------------------------------------------------------
// Busca e importação
// ---------------------------------------------------------------------------

async function searchOmkar(keyword: string): Promise<SearchItem[]> {
  const apiKey = process.env.OMKAR_API_KEY;
  if (!apiKey) {
    console.error("OMKAR_API_KEY não configurada");
    return [];
  }

  try {
    const url = `${OMKAR_BASE_URL}/search?query=${encodeURIComponent(keyword)}`;
    const response = await fetch(url, {
      headers: { "API-Key": apiKey, "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error(`Busca falhou para "${keyword}": HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data.results) return data.results;
    if (data.products) return data.products;
    return [];
  } catch (error) {
    console.error(`Erro na busca "${keyword}":`, error);
    return [];
  }
}

function passesQualityFilter(item: SearchItem): boolean {
  const rating = item.rating ?? 0;
  const orders = item.orders ?? item.ordersCount ?? 0;
  const priceRaw = item.price ?? item.salePrice ?? 0;
  const price = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw));

  return (
    rating >= QUALITY_FILTERS.minRating &&
    orders >= QUALITY_FILTERS.minOrders &&
    price > 0 &&
    price <= QUALITY_FILTERS.maxPriceUSD
  );
}

async function importProduct(
  item: SearchItem,
  exchangeRate: number,
): Promise<boolean> {
  const productId = String(item.product_id ?? item.productId ?? item.id ?? "");
  if (!productId) return false;

  // Verificar se já existe
  const existing = await prisma.product.findFirst({
    where: { aliexpressProductId: productId },
  });
  if (existing) {
    console.log(`  ⏭ Já existe: ${item.title?.slice(0, 50)}`);
    return false;
  }

  // Dados do produto
  const priceUSD = typeof item.price === "number"
    ? item.price
    : parseFloat(String(item.price ?? item.salePrice ?? 0));

  const iofRate = parseFloat(process.env.IOF_RATE ?? "0.038");
  const importTaxRate = parseFloat(process.env.IMPORT_TAX_RATE ?? "0.20");
  const costBRL = priceUSD * exchangeRate;
  const totalCostBRL = costBRL * (1 + iofRate + importTaxRate);
  const rawFinalPrice = totalCostBRL * DEFAULT_MARKUP;
  const finalPrice = psychologicalRounding(rawFinalPrice);
  const compareAtPrice = psychologicalRounding(finalPrice * 1.3);

  // Traduzir título
  const title = await translateTitle(item.title ?? `Produto ${productId}`);
  const baseSlug = slugify(title) || `produto-${productId}`;

  // Verificar slug único
  let finalSlug = baseSlug;
  const existingSlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
  if (existingSlug) {
    finalSlug = `${baseSlug}-${productId}`;
  }

  // Imagens
  const images: string[] = [];
  if (item.image) images.push(item.image.startsWith("//") ? `https:${item.image}` : item.image);
  if (item.mainImage) images.push(item.mainImage.startsWith("//") ? `https:${item.mainImage}` : item.mainImage);
  if (item.images) {
    images.push(...item.images.map((img) => (img.startsWith("//") ? `https:${img}` : img)));
  }
  const uniqueImages = [...new Set(images)].slice(0, 5);

  // URL do produto
  const productUrl = item.productUrl ?? `https://www.aliexpress.com/item/${productId}.html`;

  try {
    await prisma.product.create({
      data: {
        title,
        slug: finalSlug,
        description: "Produto importado com qualidade garantida. Confira as imagens e detalhes.",
        shortDescription: title.substring(0, 150),
        price: new Prisma.Decimal(finalPrice),
        compareAtPrice: new Prisma.Decimal(compareAtPrice),
        costPrice: new Prisma.Decimal(Math.round(costBRL * 100) / 100),
        stock: item.stock ?? 50,
        isActive: false,
        isDraft: true,
        aliexpressUrl: productUrl,
        aliexpressId: productId,
        aliexpressProductId: productId,
        costPriceUSD: priceUSD,
        exchangeRateAtImport: exchangeRate,
        syncPrice: true,
        outOfStock: false,
        profitMargin: new Prisma.Decimal((DEFAULT_MARKUP - 1) * 100),
        autoSync: true,
        needsTranslation: title === (item.title ?? ""),
        metaTitle: `${title} | Frete Grátis | Fofurinhas Baby`,
        metaDescription: title.substring(0, 155),
        images: {
          create: uniqueImages.map((url, index) => ({
            url,
            alt: `${title} - Imagem ${index + 1}`,
            sortOrder: index,
          })),
        },
      },
    });

    console.log(`  ✅ Importado: ${title.slice(0, 60)} (USD ${priceUSD.toFixed(2)} → R$ ${finalPrice.toFixed(2)})`);
    return true;
  } catch (error) {
    console.error(`  ❌ Erro ao salvar ${productId}:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Execução principal
// ---------------------------------------------------------------------------

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Fofurinhas Baby — Importação em Lote");
  console.log("═══════════════════════════════════════════════════\n");

  const exchangeRate = await fetchExchangeRate();
  console.log(`💰 Taxa de câmbio: USD 1 = R$ ${exchangeRate.toFixed(2)}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFiltered = 0;

  for (const keyword of BABY_KEYWORDS) {
    console.log(`\n🔍 Buscando: "${keyword}"`);

    const results = await searchOmkar(keyword);
    console.log(`   Encontrados: ${results.length} produtos`);

    if (results.length === 0) continue;

    // Filtrar por qualidade
    const qualified = results.filter(passesQualityFilter);
    const filtered = results.length - qualified.length;
    totalFiltered += filtered;
    console.log(`   Qualificados: ${qualified.length} (${filtered} filtrados por qualidade)`);

    // Importar top 20
    const toImport = qualified.slice(0, 20);

    for (const item of toImport) {
      const imported = await importProduct(item, exchangeRate);
      if (imported) {
        totalImported++;
      } else {
        totalSkipped++;
      }

      // Rate limiting: 500ms entre requisições ao banco
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Rate limiting: 2s entre buscas no Omkar
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  Resultado: ${totalImported} importados, ${totalSkipped} já existentes, ${totalFiltered} filtrados`);
  console.log("  Todos os produtos foram importados como RASCUNHO.");
  console.log("  Acesse /admin/products para revisar e ativar.");
  console.log("═══════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Erro fatal:", error);
  prisma.$disconnect();
  process.exit(1);
});
