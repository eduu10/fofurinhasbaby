import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

interface ScrapedProduct {
  aliexpressId: string;
  title: string;
  description: string;
  shortDescription: string;
  costPrice: number;
  images: { url: string; alt: string }[];
  variations: { name: string; value: string; stock: number }[];
  stock: number;
}

/**
 * Download an image from a URL and save it locally.
 * Returns the local URL path (e.g., /uploads/uuid.jpg).
 */
async function downloadAndSaveImage(imageUrl: string): Promise<string | null> {
  try {
    // Normalize URL
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

    if (!res.ok) {
      console.error(`Failed to download image: ${res.status} ${finalUrl}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";

    // Also check URL extension
    const urlExt = finalUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
    if (urlExt) {
      ext = urlExt[1].toLowerCase();
      if (ext === "jpeg") ext = "jpg";
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Only save if we got actual image data (more than 1KB)
    if (buffer.length < 1024) {
      console.error(`Image too small (${buffer.length} bytes), skipping: ${finalUrl}`);
      return null;
    }

    await writeFile(filepath, buffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error(`Error downloading image: ${imageUrl}`, error);
    return null;
  }
}

/**
 * Fetch HTML from AliExpress with multiple URL variations and headers.
 */
async function fetchAliExpressHtml(url: string, aliexpressId: string): Promise<string> {
  const urlVariants = [
    url,
    `https://www.aliexpress.com/item/${aliexpressId}.html`,
    `https://pt.aliexpress.com/item/${aliexpressId}.html`,
    `https://m.aliexpress.com/item/${aliexpressId}.html`,
  ];

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "identity",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  for (const tryUrl of urlVariants) {
    try {
      const res = await fetch(tryUrl, {
        headers,
        redirect: "follow",
      });
      if (res.ok) {
        const html = await res.text();
        if (html.includes("alicdn.com") || html.includes("imagePathList") || html.includes("og:title")) {
          return html;
        }
      }
    } catch {
      // try next variant
    }
  }

  return "";
}

/**
 * Extract data from AliExpress HTML.
 */
function extractFromHtml(html: string, aliexpressId: string): {
  title: string;
  description: string;
  images: { url: string; alt: string }[];
  costPriceUSD: number;
  variations: { name: string; value: string; stock: number }[];
} {
  let title = "";
  let description = "";
  let costPriceUSD = 0;
  let images: { url: string; alt: string }[] = [];
  let variations: { name: string; value: string; stock: number }[] = [];

  // === TITLE ===
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
      title = m[1]
        .replace(/\s*[-|].*AliExpress.*$/i, "")
        .replace(/\s*[-|].*aliexpress.*$/i, "")
        .replace(/\s*-\s*Compre.*$/i, "")
        .trim();
      if (title.length > 5) break;
    }
  }

  // === IMAGES ===
  // Strategy 1: imagePathList JSON array
  const imgListMatch = html.match(/"imagePathList"\s*:\s*(\["[^"]*"(?:\s*,\s*"[^"]*")*\])/);
  if (imgListMatch) {
    try {
      const imgUrls = JSON.parse(imgListMatch[1]) as string[];
      images = imgUrls.map((u, i) => ({
        url: u.startsWith("//") ? `https:${u}` : u,
        alt: `${title || "Produto"} - Imagem ${i + 1}`,
      }));
    } catch { /* fallback */ }
  }

  // Strategy 2: individual alicdn.com URLs from kf/ pattern (product images)
  if (images.length === 0) {
    const kfPattern = /https?:\/\/ae\d+\.alicdn\.com\/kf\/[A-Za-z0-9]+\.(jpg|jpeg|png|webp)/gi;
    const kfMatches = html.matchAll(kfPattern);
    const seen = new Set<string>();
    for (const m of kfMatches) {
      const imgUrl = m[0];
      if (!seen.has(imgUrl) && !imgUrl.includes("_80x80") && !imgUrl.includes("_50x50")) {
        seen.add(imgUrl);
        images.push({ url: imgUrl, alt: `${title || "Produto"} - Imagem ${seen.size}` });
      }
      if (seen.size >= 6) break;
    }
  }

  // Strategy 3: any alicdn.com image URL
  if (images.length === 0) {
    const alicdnPattern = /https?:\/\/[^"'\s,]+\.alicdn\.com\/[^"'\s,]+\.(jpg|jpeg|png|webp)/gi;
    const allMatches = html.matchAll(alicdnPattern);
    const seen = new Set<string>();
    for (const m of allMatches) {
      const imgUrl = m[0];
      if (
        !seen.has(imgUrl) &&
        !imgUrl.includes("_50x50") &&
        !imgUrl.includes("_80x80") &&
        !imgUrl.includes("_100x100") &&
        !imgUrl.includes("favicon") &&
        !imgUrl.includes("logo") &&
        !imgUrl.includes("icon") &&
        imgUrl.includes("/kf/")
      ) {
        seen.add(imgUrl);
        images.push({ url: imgUrl, alt: `${title || "Produto"} - Imagem ${seen.size}` });
      }
      if (seen.size >= 6) break;
    }
  }

  // Strategy 4: og:image
  if (images.length === 0) {
    const ogImgMatch = html.match(/property="og:image"\s+content="([^"]+)"/)
      || html.match(/content="([^"]+)"\s+property="og:image"/);
    if (ogImgMatch) {
      const u = ogImgMatch[1].startsWith("//") ? `https:${ogImgMatch[1]}` : ogImgMatch[1];
      images.push({ url: u, alt: title || "Produto" });
    }
  }

  // === PRICE ===
  const pricePatterns = [
    /"formatedAmount"\s*:\s*"(?:US\s*\$|R\$)\s*([\d.,]+)"/,
    /"minAmount"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
    /"minPrice"\s*:\s*"([\d.]+)"/,
    /"discountPrice"\s*:\s*\{[^}]*?"minPrice"\s*:\s*([\d.]+)/,
    /property="product:price:amount"\s+content="([\d.]+)"/,
    /content="([\d.]+)"\s+property="product:price:amount"/,
  ];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) {
      costPriceUSD = parseFloat(m[1].replace(",", "."));
      if (costPriceUSD > 0) break;
    }
  }

  // === DESCRIPTION ===
  const descPatterns = [
    /property="og:description"\s+content="([^"]+)"/,
    /content="([^"]+)"\s+property="og:description"/,
    /<meta\s+name="description"\s+content="([^"]+)"/,
  ];
  for (const p of descPatterns) {
    const m = html.match(p);
    if (m && m[1].length > 10) {
      description = m[1].trim();
      break;
    }
  }

  // === VARIATIONS ===
  const skuMatch = html.match(/"skuPropertyList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (skuMatch) {
    try {
      const skuList = JSON.parse(skuMatch[1]);
      for (const sku of skuList) {
        const propName = sku.skuPropertyName || sku.name || "";
        const values = sku.skuPropertyValues || sku.values || [];
        for (const val of values) {
          const propValue = val.propertyValueDisplayName || val.name || val.propertyValueName || "";
          if (propName && propValue) {
            variations.push({ name: propName, value: propValue, stock: Math.floor(Math.random() * 50) + 10 });
          }
        }
      }
    } catch { /* ignore */ }
  }

  return { title, description, images, costPriceUSD, variations };
}

/**
 * Real AliExpress product scraper.
 * Fetches the product page HTML, extracts data, and downloads images locally.
 */
async function scrapeAliExpressProduct(url: string): Promise<ScrapedProduct> {
  const idMatch = url.match(/\/(\d+)\.html/) || url.match(/item\/(\d+)/);
  const aliexpressId = idMatch ? idMatch[1] : String(Date.now());

  try {
    const html = await fetchAliExpressHtml(url, aliexpressId);

    if (!html) {
      throw new Error("Could not fetch AliExpress page");
    }

    const extracted = extractFromHtml(html, aliexpressId);

    const title = extracted.title || `Produto AliExpress ${aliexpressId}`;
    const description = extracted.description || "Produto importado do AliExpress. Confira as imagens e detalhes.";

    // Convert USD to BRL
    const usdToBrl = 5.5;
    const costPriceBRL = extracted.costPriceUSD > 0
      ? parseFloat((extracted.costPriceUSD * usdToBrl).toFixed(2))
      : parseFloat((Math.random() * 45 + 15).toFixed(2));

    // Download images locally
    let localImages: { url: string; alt: string }[] = [];
    if (extracted.images.length > 0) {
      console.log(`Downloading ${extracted.images.length} images from AliExpress CDN...`);
      const downloadPromises = extracted.images.map(async (img, i) => {
        const localUrl = await downloadAndSaveImage(img.url);
        if (localUrl) {
          return { url: localUrl, alt: img.alt };
        }
        return null;
      });
      const results = await Promise.all(downloadPromises);
      localImages = results.filter((r): r is { url: string; alt: string } => r !== null);
    }

    const images = localImages.length > 0
      ? localImages
      : [{ url: `https://placehold.co/800x800/FFB6C1/333333?text=Sem+Imagem`, alt: title }];

    const totalStock = extracted.variations.length > 0
      ? extracted.variations.reduce((sum, v) => sum + v.stock, 0)
      : Math.floor(Math.random() * 100) + 20;

    return {
      aliexpressId,
      title,
      description,
      shortDescription: description.substring(0, 150) + (description.length > 150 ? "..." : ""),
      costPrice: costPriceBRL,
      images,
      variations: extracted.variations,
      stock: totalStock,
    };
  } catch (error) {
    console.error("Scrape error:", error);
    return {
      aliexpressId,
      title: `Produto AliExpress ${aliexpressId}`,
      description: "Produto importado do AliExpress. Edite os detalhes manualmente.",
      shortDescription: "Produto importado do AliExpress.",
      costPrice: parseFloat((Math.random() * 45 + 15).toFixed(2)),
      images: [{ url: `https://placehold.co/800x800/FFB6C1/333333?text=Produto+${aliexpressId}`, alt: `Produto ${aliexpressId}` }],
      variations: [],
      stock: 50,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { url, profitMargin: customMargin, categoryId } = body;

    if (!url) {
      return errorResponse("URL do AliExpress é obrigatória", 400);
    }

    if (!url.includes("aliexpress") && !url.includes("ali")) {
      return errorResponse("URL inválida. Forneça uma URL do AliExpress", 400);
    }

    const profitMargin = customMargin || 40;

    // Scrape the AliExpress product page and download images
    const scraped = await scrapeAliExpressProduct(url);

    // Calculate selling price with profit margin
    const sellingPrice = parseFloat(
      (scraped.costPrice * (1 + profitMargin / 100)).toFixed(2)
    );

    // Generate compare-at price (slightly higher to show "discount")
    const compareAtPrice = parseFloat((sellingPrice * 1.3).toFixed(2));

    // Create slug
    let slug = slugify(scraped.title);
    const existingSlug = await prisma.product.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = await prisma.product.create({
      data: {
        title: scraped.title,
        slug,
        description: scraped.description,
        shortDescription: scraped.shortDescription,
        price: sellingPrice,
        compareAtPrice,
        costPrice: scraped.costPrice,
        stock: scraped.stock,
        isActive: false,
        isDraft: true,
        categoryId: categoryId || null,
        aliexpressUrl: url,
        aliexpressId: scraped.aliexpressId,
        profitMargin,
        images: {
          create: scraped.images.map((img, index) => ({
            url: img.url,
            alt: img.alt,
            sortOrder: index,
          })),
        },
        variations: {
          create: scraped.variations.map((v) => ({
            name: v.name,
            value: v.value,
            stock: v.stock,
          })),
        },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variations: true,
        category: true,
      },
    });

    return successResponse(
      {
        product,
        importInfo: {
          sourceUrl: url,
          aliexpressId: scraped.aliexpressId,
          costPrice: scraped.costPrice,
          sellingPrice,
          profitMargin,
          imagesDownloaded: scraped.images.filter(img => img.url.startsWith("/uploads/")).length,
          totalImages: scraped.images.length,
          message:
            "Produto importado como rascunho. Revise e ative quando pronto.",
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Import product error:", error);
    return errorResponse("Erro ao importar produto", 500);
  }
}
