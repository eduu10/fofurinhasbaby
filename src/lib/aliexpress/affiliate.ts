import {
  getAffiliateClient,
  getTrackingId,
  withRetry,
  convertToBrl,
} from "./clients";
import type { AEProduct } from "./types";

// ---------------------------------------------------------------------------
// 1. generateAffiliateLink
// ---------------------------------------------------------------------------

/**
 * Converts a standard AliExpress product URL into an affiliate link
 * with the configured tracking ID for commission earning.
 *
 * @param productUrl  Full AliExpress product URL
 * @returns Affiliate link URL, or the original URL on failure
 */
export async function generateAffiliateLink(
  productUrl: string,
): Promise<string> {
  const client = getAffiliateClient();
  const trackingId = getTrackingId();

  if (!client || !trackingId) return productUrl;

  const result = await withRetry(() =>
    client.generateAffiliateLinks({
      promotion_link_type: 0,
      source_values: productUrl,
      tracking_id: trackingId,
    }),
  );

  if (!result.ok) {
    console.error("[AE] generateAffiliateLink error:", "message" in result ? result.message : "unknown");
    return productUrl;
  }

  const data = result.data as unknown as Record<string, unknown>;
  const links = data.promotion_links as Record<string, unknown>[] | undefined;

  if (links && links.length > 0) {
    const promoUrl = links[0].promotion_link as string | undefined;
    if (promoUrl) return promoUrl;
  }

  return productUrl;
}

// ---------------------------------------------------------------------------
// 2. generateAffiliateLinksBatch
// ---------------------------------------------------------------------------

/**
 * Generates affiliate links for multiple product URLs at once.
 *
 * @param productUrls  Array of AliExpress product URLs
 * @returns Map of original URL -> affiliate URL
 */
export async function generateAffiliateLinksBatch(
  productUrls: string[],
): Promise<Map<string, string>> {
  const resultMap = new Map<string, string>();
  const client = getAffiliateClient();
  const trackingId = getTrackingId();

  if (!client || !trackingId) {
    for (const url of productUrls) resultMap.set(url, url);
    return resultMap;
  }

  // AliExpress accepts multiple URLs separated by commas (max ~50)
  const batchSize = 50;
  for (let i = 0; i < productUrls.length; i += batchSize) {
    const batch = productUrls.slice(i, i + batchSize);
    const sourceValues = batch.join(",");

    const apiResult = await withRetry(() =>
      client.generateAffiliateLinks({
        promotion_link_type: 0,
        source_values: sourceValues,
        tracking_id: trackingId,
      }),
    );

    if (apiResult.ok) {
      const data = apiResult.data as unknown as Record<string, unknown>;
      const links = data.promotion_links as Record<string, unknown>[] | undefined;
      if (links) {
        for (const link of links) {
          const original = (link.source_value as string) ?? "";
          const promo = (link.promotion_link as string) ?? original;
          resultMap.set(original, promo);
        }
      }
    }

    // Set missing URLs to themselves
    for (const url of batch) {
      if (!resultMap.has(url)) resultMap.set(url, url);
    }
  }

  return resultMap;
}

// ---------------------------------------------------------------------------
// 3. getAffiliateFeaturedProducts
// ---------------------------------------------------------------------------

/**
 * Fetches products with high commission and good ratings for the storefront.
 * Searches multiple keywords and returns the best results.
 *
 * @param keywords  Array of search terms (e.g. ["baby clothes", "baby toys"])
 * @param maxPerKeyword  Maximum results per keyword
 * @param margin  Profit margin to apply
 */
export async function getAffiliateFeaturedProducts(
  keywords: string[],
  maxPerKeyword = 6,
  margin = 0.4,
): Promise<AEProduct[]> {
  const client = getAffiliateClient();
  const trackingId = getTrackingId();

  if (!client || !trackingId) return [];

  const allProducts: AEProduct[] = [];

  for (const keyword of keywords) {
    const result = await withRetry(() =>
      client.getHotProducts({
        keywords: keyword,
        page_size: String(maxPerKeyword),
        target_currency: "USD",
        target_language: "PT",
        ship_to_country: "BR",
        tracking_id: trackingId,
        sort: "LAST_VOLUME_DESC",
      } as Parameters<typeof client.getHotProducts>[0]),
    );

    if (!result.ok) {
      console.error(`[AE] getAffiliateFeaturedProducts(${keyword}) error:`, "message" in result ? result.message : "unknown");
      continue;
    }

    const data = result.data as unknown as Record<string, unknown>;
    const products = (data.products as Record<string, unknown>[] | undefined) ?? [];

    for (const raw of products) {
      const product = await normaliseAffiliateProduct(raw, margin);
      allProducts.push(product);
    }
  }

  // Deduplicate by product ID
  const seen = new Set<string>();
  return allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Internal normalisation (same logic as products.ts but self-contained
// so this module has no circular dependency)
// ---------------------------------------------------------------------------

async function normaliseAffiliateProduct(
  raw: Record<string, unknown>,
  margin: number,
): Promise<AEProduct> {
  const images: string[] = [];
  const mainImg = raw.product_main_image_url as string | undefined;
  if (mainImg) images.push(mainImg);

  const smallImgs = raw.product_small_image_urls as
    | Record<string, string[]>
    | string[]
    | undefined;
  if (Array.isArray(smallImgs)) {
    images.push(...smallImgs);
  } else if (smallImgs && typeof smallImgs === "object") {
    const arr = (smallImgs as Record<string, string[]>).string ?? [];
    images.push(...arr);
  }

  const salePriceStr = (raw.target_sale_price as string) ?? "0";
  const originalPriceStr = (raw.target_original_price as string) ?? salePriceStr;

  const salePrice = parseFloat(salePriceStr.replace(/[^0-9.]/g, ""));
  const origPrice = parseFloat(originalPriceStr.replace(/[^0-9.]/g, ""));

  const costPrice = await convertToBrl(salePrice, 0);
  const price = await convertToBrl(salePrice, margin);
  const originalPrice = await convertToBrl(origPrice, margin);
  const discount =
    originalPrice > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  // Deduplicate images
  const uniqueImages: string[] = [];
  const seenImages = new Set<string>();
  for (const img of images) {
    if (!seenImages.has(img)) {
      seenImages.add(img);
      uniqueImages.push(img);
    }
  }

  return {
    id: String(raw.product_id ?? ""),
    title: (raw.product_title as string) ?? "",
    description: (raw.product_detail_url as string) ?? "",
    images: uniqueImages,
    price,
    originalPrice,
    costPrice,
    currency: "BRL",
    discount,
    rating:
      parseFloat((raw.evaluate_rate as string)?.replace("%", "") ?? "0") / 20,
    reviewCount: 0,
    salesCount: (raw.lastest_volume as number) ?? 0,
    variations: [],
    shippingFree: (raw.is_free_shipping as boolean) ?? false,
    categoryId: String(
      raw.first_level_category_id ?? raw.second_level_category_id ?? "",
    ),
    productUrl:
      (raw.product_detail_url as string) ??
      `https://www.aliexpress.com/item/${raw.product_id}.html`,
    stock: 100,
  };
}
