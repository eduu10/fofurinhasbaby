import {
  getDropshipperClient,
  getAffiliateClient,
  getTrackingId,
  withRetry,
  convertToBrl,
  getUsdToBrlRate,
} from "./clients";
import type {
  AEProduct,
  AEShippingOption,
  AEVariation,
  ProductSearchFilters,
  PaginatedResult,
} from "./types";

// ---------------------------------------------------------------------------
// 1. getProductDetails
// ---------------------------------------------------------------------------

/**
 * Fetches full product details from AliExpress Dropshipper API.
 * Returns a normalised `AEProduct` with prices converted to BRL.
 */
export async function getProductDetails(
  productId: string,
  margin = 0.4,
): Promise<AEProduct | null> {
  const client = getDropshipperClient();
  if (!client) return null;

  const result = await withRetry(() =>
    client.productDetails({
      product_id: Number(productId),
      ship_to_country: "BR",
      target_currency: "USD",
      target_language: "PT",
    }),
  );

  if (!result.ok) {
    console.error("[AE] productDetails error:", "message" in result ? result.message : "unknown");
    return null;
  }

  const data = result.data as unknown as Record<string, unknown>;
  return normaliseProduct(data, margin);
}

// ---------------------------------------------------------------------------
// 2. searchProducts
// ---------------------------------------------------------------------------

/**
 * Searches products using the Affiliate `queryProducts` endpoint which
 * supports keyword search, price filters and sorting.
 */
export async function searchProducts(
  filters: ProductSearchFilters,
  margin = 0.4,
): Promise<PaginatedResult<AEProduct>> {
  const empty: PaginatedResult<AEProduct> = {
    items: [],
    total: 0,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    hasMore: false,
  };

  const client = getAffiliateClient();
  if (!client) return empty;

  const params: Record<string, string | undefined> = {
    keywords: filters.keyword,
    category_ids: filters.categoryId,
    min_sale_price: filters.minPrice ? String(filters.minPrice) : undefined,
    max_sale_price: filters.maxPrice ? String(filters.maxPrice) : undefined,
    page_no: String(filters.page ?? 1),
    page_size: String(filters.pageSize ?? 20),
    sort: (filters.sort as string) || "LAST_VOLUME_DESC",
    target_currency: "USD",
    target_language: "PT",
    ship_to_country: "BR",
    tracking_id: getTrackingId(),
  };

  // Remove undefined values
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined),
  );

  const result = await withRetry(() =>
    client.queryProducts(cleanParams as Parameters<typeof client.queryProducts>[0]),
  );

  if (!result.ok) {
    console.error("[AE] searchProducts error:", "message" in result ? result.message : "unknown");
    return empty;
  }

  const data = result.data as unknown as Record<string, unknown>;
  const products = (data.products as Record<string, unknown>[] | undefined) ?? [];
  const total = (data.total_record_count as number) ?? 0;
  const pageSize = filters.pageSize ?? 20;
  const page = filters.page ?? 1;

  const items = await Promise.all(
    products.map((p) => normaliseAffiliateProduct(p, margin)),
  );

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

// ---------------------------------------------------------------------------
// 3. getHotProducts
// ---------------------------------------------------------------------------

/**
 * Retrieves trending/hot products, optionally filtered by keyword.
 */
export async function getHotProducts(
  keyword?: string,
  pageSize = 12,
  margin = 0.4,
): Promise<AEProduct[]> {
  const client = getAffiliateClient();
  if (!client) return [];

  const params: Record<string, string | number | undefined> = {
    keywords: keyword,
    page_size: String(pageSize),
    target_currency: "USD",
    target_language: "PT",
    ship_to_country: "BR",
    tracking_id: getTrackingId(),
    sort: "LAST_VOLUME_DESC",
  };

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined),
  );

  const result = await withRetry(() =>
    client.getHotProducts(cleanParams as Parameters<typeof client.getHotProducts>[0]),
  );

  if (!result.ok) {
    console.error("[AE] getHotProducts error:", "message" in result ? result.message : "unknown");
    return [];
  }

  const data = result.data as unknown as Record<string, unknown>;
  const products = (data.products as Record<string, unknown>[] | undefined) ?? [];

  return Promise.all(products.map((p) => normaliseAffiliateProduct(p, margin)));
}

// ---------------------------------------------------------------------------
// 4. getProductsByCategory
// ---------------------------------------------------------------------------

/**
 * Returns products for a given AliExpress category ID.
 */
export async function getProductsByCategory(
  categoryId: string,
  page = 1,
  pageSize = 20,
  margin = 0.4,
): Promise<PaginatedResult<AEProduct>> {
  return searchProducts(
    { categoryId, page, pageSize, sort: "LAST_VOLUME_DESC" },
    margin,
  );
}

// ---------------------------------------------------------------------------
// 5. calculateShipping
// ---------------------------------------------------------------------------

/**
 * Calculates real-time shipping options for a product to Brazil.
 */
export async function calculateShipping(
  productId: string,
  quantity: number,
  countryCode = "BR",
): Promise<AEShippingOption[]> {
  const client = getDropshipperClient();
  if (!client) return [];

  const result = await withRetry(() =>
    client.shippingInfo({
      product_id: Number(productId),
      product_num: quantity,
      country_code: countryCode,
      send_goods_country_code: "CN",
    }),
  );

  if (!result.ok) {
    console.error("[AE] shippingInfo error:", "message" in result ? result.message : "unknown");
    return [];
  }

  const data = result.data as unknown as Record<string, unknown>;
  const options =
    (data.aeop_freight_calculate_result_for_buyer_d_t_o_list as Record<string, unknown>[] | undefined) ?? [];

  const rate = await getUsdToBrlRate();

  return options.map((opt) => {
    const freight = opt.freight as Record<string, unknown> | undefined;
    const amount = freight?.amount as string | undefined;
    return {
      serviceName: (opt.service_name as string) ?? "Standard",
      trackingAvailable: (opt.tracking as boolean) ?? false,
      estimatedDays: (opt.estimated_delivery_time as number) ?? 30,
      cost:
        Math.round(
          (parseFloat(amount ?? "0") * rate) * 100,
        ) / 100,
      currency: "BRL",
    };
  });
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a product from the Dropshipper `productDetails` response.
 */
async function normaliseProduct(
  raw: Record<string, unknown>,
  margin: number,
): Promise<AEProduct> {
  // Extract nested structures
  const multimedia = raw.ae_multimedia_info_dto as Record<string, unknown> | undefined;
  const imageList =
    (multimedia?.image_urls as string) ??
    (raw.product_small_image_urls as Record<string, string[]> | undefined)?.string?.join(",") ??
    "";
  const images = imageList
    .split(",")
    .map((u: string) => u.trim())
    .filter(Boolean);

  // Price info
  const skuModule = raw.ae_item_sku_info_dtos as Record<string, unknown> | undefined;
  const skus =
    (skuModule?.ae_item_sku_info_d_t_o as Record<string, unknown>[]) ?? [];

  let minPriceUsd = Infinity;
  let maxPriceUsd = 0;
  const variations: AEVariation[] = [];

  for (const sku of skus) {
    const offer = sku.offer_sale_price
      ? parseFloat(sku.offer_sale_price as string)
      : parseFloat((sku.sku_price as string) ?? "0");
    if (offer < minPriceUsd) minPriceUsd = offer;
    if (offer > maxPriceUsd) maxPriceUsd = offer;
  }

  if (minPriceUsd === Infinity) {
    minPriceUsd = parseFloat((raw.sku_price as string) ?? "0");
    maxPriceUsd = minPriceUsd;
  }

  // Build variations from sku property list
  const propModule = raw.ae_item_properties as Record<string, unknown> | undefined;
  const props =
    (propModule?.ae_item_property as Record<string, unknown>[]) ?? [];

  const variationMap = new Map<string, AEVariation>();
  for (const prop of props) {
    const propName = (prop.attr_name as string) ?? "";
    const propValue = (prop.attr_value as string) ?? "";
    const propId = (prop.attr_name_id as string) ?? propName;

    if (!variationMap.has(propId)) {
      variationMap.set(propId, {
        id: propId,
        name: propName,
        values: [],
      });
    }
    variationMap.get(propId)!.values.push({
      id: `${propId}-${propValue}`,
      label: propValue,
      skuAttr: (prop.sku_property_value as string) ?? "",
      image: (prop.property_value_definition_name as string) || undefined,
    });
  }
  variations.push(...Array.from(variationMap.values()));

  const costPrice = await convertToBrl(minPriceUsd, 0);
  const price = await convertToBrl(minPriceUsd, margin);
  const originalPrice = Math.round(price * 1.3 * 100) / 100;
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

  return {
    id: String(raw.product_id ?? ""),
    title: (raw.subject as string) ?? (raw.product_title as string) ?? "",
    description:
      (raw.detail as string) ?? (raw.product_description as string) ?? "",
    images,
    price,
    originalPrice,
    costPrice,
    currency: "BRL",
    discount,
    rating: parseFloat((raw.avg_evaluation_rating as string) ?? "0"),
    reviewCount: (raw.evaluation_count as number) ?? 0,
    salesCount: (raw.order_count as number) ?? 0,
    variations,
    shippingFree: (raw.is_free_shipping as boolean) ?? false,
    categoryId: String(raw.category_id ?? ""),
    productUrl: `https://www.aliexpress.com/item/${raw.product_id}.html`,
    stock: (raw.product_stock as number) ?? 100,
  };
}

/**
 * Normalises a product from the Affiliate `queryProducts` / `getHotProducts` response.
 */
async function normaliseAffiliateProduct(
  raw: Record<string, unknown>,
  margin: number,
): Promise<AEProduct> {
  const images: string[] = [];

  // product_main_image_url
  const mainImg = raw.product_main_image_url as string | undefined;
  if (mainImg) images.push(mainImg);

  // product_small_image_urls
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

  // Prices – affiliate API returns price as string with currency symbol
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
    rating: parseFloat((raw.evaluate_rate as string)?.replace("%", "") ?? "0") / 20,
    reviewCount: 0,
    salesCount: (raw.lastest_volume as number) ?? 0,
    variations: [],
    shippingFree: (raw.is_free_shipping as boolean) ?? false,
    categoryId: String(raw.first_level_category_id ?? raw.second_level_category_id ?? ""),
    productUrl:
      (raw.product_detail_url as string) ??
      `https://www.aliexpress.com/item/${raw.product_id}.html`,
    stock: 100,
  };
}
