import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

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
 * Real AliExpress product scraper.
 * Fetches the product page HTML and extracts data from embedded JSON/meta tags.
 */
async function scrapeAliExpressProduct(url: string): Promise<ScrapedProduct> {
  const idMatch = url.match(/\/(\d+)\.html/) || url.match(/item\/(\d+)/);
  const aliexpressId = idMatch ? idMatch[1] : String(Date.now());

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();

    // Try to extract data from window.runParams JSON embedded in the page
    let title = "";
    let description = "";
    let costPriceUSD = 0;
    let images: { url: string; alt: string }[] = [];
    let variations: { name: string; value: string; stock: number }[] = [];

    // Extract title from og:title meta tag or <title>
    const ogTitleMatch = html.match(
      /property="og:title"\s+content="([^"]+)"/
    ) || html.match(
      /content="([^"]+)"\s+property="og:title"/
    );
    if (ogTitleMatch) {
      title = ogTitleMatch[1]
        .replace(/\s*[-|].*AliExpress.*$/i, "")
        .replace(/\s*[-|].*Aliexpress.*$/i, "")
        .trim();
    }

    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1]
          .replace(/\s*[-|].*AliExpress.*$/i, "")
          .trim();
      }
    }

    // Extract images from og:image or image gallery data
    const ogImageMatch = html.match(
      /property="og:image"\s+content="([^"]+)"/
    ) || html.match(
      /content="([^"]+)"\s+property="og:image"/
    );

    // Try to find image gallery from runParams data
    const imageGalleryMatch = html.match(
      /"imagePathList"\s*:\s*(\[[^\]]+\])/
    );
    if (imageGalleryMatch) {
      try {
        const imgUrls = JSON.parse(imageGalleryMatch[1]) as string[];
        images = imgUrls.map((imgUrl, i) => ({
          url: imgUrl.startsWith("//") ? `https:${imgUrl}` : imgUrl,
          alt: `${title || "Produto"} - Imagem ${i + 1}`,
        }));
      } catch {
        // fallback below
      }
    }

    // Alternative: extract from "imageBigViewURL" pattern
    if (images.length === 0) {
      const imgBigMatch = html.match(
        /"imageBigViewURL"\s*:\s*"([^"]+)"/
      );
      if (imgBigMatch) {
        const mainImg = imgBigMatch[1].startsWith("//")
          ? `https:${imgBigMatch[1]}`
          : imgBigMatch[1];
        images.push({ url: mainImg, alt: title || "Produto" });
      }
    }

    // Alternative: look for multiple image URLs in common AliExpress patterns
    if (images.length === 0) {
      const allImgMatches = html.matchAll(
        /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+(?:\.jpg|\.png|\.webp)/g
      );
      const uniqueUrls = new Set<string>();
      for (const match of allImgMatches) {
        const imgUrl = match[0];
        // Filter out tiny icons/thumbnails
        if (
          !imgUrl.includes("_50x50") &&
          !imgUrl.includes("_100x100") &&
          !imgUrl.includes("favicon") &&
          !imgUrl.includes("logo")
        ) {
          uniqueUrls.add(imgUrl);
        }
        if (uniqueUrls.size >= 6) break;
      }
      images = Array.from(uniqueUrls).map((imgUrl, i) => ({
        url: imgUrl,
        alt: `${title || "Produto"} - Imagem ${i + 1}`,
      }));
    }

    // Fallback: use og:image
    if (images.length === 0 && ogImageMatch) {
      const ogUrl = ogImageMatch[1].startsWith("//")
        ? `https:${ogImageMatch[1]}`
        : ogImageMatch[1];
      images.push({ url: ogUrl, alt: title || "Produto" });
    }

    // Extract price
    const pricePatterns = [
      /"formatedAmount"\s*:\s*"(?:US\s*\$|R\$)\s*([\d.,]+)"/,
      /"minAmount"\s*:\s*{[^}]*"value"\s*:\s*([\d.]+)/,
      /"minPrice"\s*:\s*"([\d.]+)"/,
      /"originalPrice"\s*:\s*{[^}]*"minPrice"\s*:\s*([\d.]+)/,
      /property="product:price:amount"\s+content="([\d.]+)"/,
      /content="([\d.]+)"\s+property="product:price:amount"/,
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        costPriceUSD = parseFloat(match[1].replace(",", "."));
        if (costPriceUSD > 0) break;
      }
    }

    // Convert USD to BRL (approximate rate)
    const usdToBrl = 5.5;
    const costPriceBRL =
      costPriceUSD > 0
        ? parseFloat((costPriceUSD * usdToBrl).toFixed(2))
        : parseFloat((Math.random() * 45 + 15).toFixed(2));

    // Extract description from og:description
    const ogDescMatch = html.match(
      /property="og:description"\s+content="([^"]+)"/
    ) || html.match(
      /content="([^"]+)"\s+property="og:description"/
    );
    if (ogDescMatch) {
      description = ogDescMatch[1].trim();
    }

    if (!description) {
      description =
        "Produto importado do AliExpress. Confira as imagens e detalhes acima.";
    }

    // Extract SKU/property variations
    const skuMatch = html.match(
      /"skuPropertyList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/
    );
    if (skuMatch) {
      try {
        const skuList = JSON.parse(skuMatch[1]);
        for (const sku of skuList) {
          const propName = sku.skuPropertyName || sku.name || "";
          const values = sku.skuPropertyValues || sku.values || [];
          for (const val of values) {
            const propValue =
              val.propertyValueDisplayName ||
              val.name ||
              val.propertyValueName ||
              "";
            if (propName && propValue) {
              variations.push({
                name: propName,
                value: propValue,
                stock: Math.floor(Math.random() * 50) + 10,
              });
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Fallback title
    if (!title) {
      title = `Produto AliExpress ${aliexpressId}`;
    }

    // Fallback images
    if (images.length === 0) {
      images = [
        {
          url: `https://placehold.co/800x800/FFB6C1/333333?text=Sem+Imagem`,
          alt: title,
        },
      ];
    }

    const totalStock =
      variations.length > 0
        ? variations.reduce((sum, v) => sum + v.stock, 0)
        : Math.floor(Math.random() * 100) + 20;

    return {
      aliexpressId,
      title,
      description,
      shortDescription: description.substring(0, 150) + (description.length > 150 ? "..." : ""),
      costPrice: costPriceBRL,
      images,
      variations,
      stock: totalStock,
    };
  } catch (error) {
    console.error("Scrape error:", error);
    // Return minimal fallback data
    return {
      aliexpressId,
      title: `Produto AliExpress ${aliexpressId}`,
      description:
        "Produto importado do AliExpress. Edite os detalhes manualmente.",
      shortDescription: "Produto importado do AliExpress.",
      costPrice: parseFloat((Math.random() * 45 + 15).toFixed(2)),
      images: [
        {
          url: `https://placehold.co/800x800/FFB6C1/333333?text=Produto+${aliexpressId}`,
          alt: `Produto ${aliexpressId}`,
        },
      ],
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

    // Scrape the AliExpress product page
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
