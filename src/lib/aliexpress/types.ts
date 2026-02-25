// ---------------------------------------------------------------------------
// Shared types for the AliExpress integration layer
// ---------------------------------------------------------------------------

/** A normalised product returned by our service layer. */
export interface AEProduct {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: number;          // Price in BRL (with margin applied)
  originalPrice: number;  // Original price in BRL (compare-at)
  costPrice: number;      // Cost price in BRL (no margin)
  currency: string;
  discount: number;       // Discount percentage
  rating: number;
  reviewCount: number;
  salesCount: number;
  variations: AEVariation[];
  shippingFree: boolean;
  categoryId: string;
  productUrl: string;
  stock: number;
}

export interface AEVariation {
  id: string;
  name: string;   // e.g. "Cor", "Tamanho"
  values: AEVariationValue[];
}

export interface AEVariationValue {
  id: string;
  label: string;       // e.g. "Rosa", "M"
  image?: string;
  skuAttr: string;     // sku_attr value for ordering
  priceAdjust?: number; // additional cost in BRL
}

/** Shipping option returned by calculateShipping */
export interface AEShippingOption {
  serviceName: string;
  trackingAvailable: boolean;
  estimatedDays: number;
  cost: number;   // in BRL
  currency: string;
}

/** Payload to create a dropshipping order */
export interface OrderPayload {
  address: {
    fullName: string;
    phone: string;
    address: string;
    address2?: string;
    city: string;
    province: string;
    zipCode: string;
    country: string;
    cpf?: string;
  };
  items: OrderItemPayload[];
}

export interface OrderItemPayload {
  productId: number;
  skuAttr?: string;
  quantity: number;
  logisticsServiceName?: string;
  orderMemo?: string;
}

/** Normalised order status from AliExpress */
export interface AEOrderStatus {
  orderId: string;
  status: string;
  statusTranslated: string;
  trackingCode?: string;
  trackingUrl?: string;
  logisticsService?: string;
  updatedAt: string;
}

/** Search filters */
export interface ProductSearchFilters {
  keyword?: string;
  categoryId?: string;
  minPrice?: number;   // in USD cents for the API
  maxPrice?: number;   // in USD cents for the API
  sort?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Tipos para o HybridClient (Omkar + ae_sdk + Cache)
// ---------------------------------------------------------------------------

/** Dados brutos retornados pela API Omkar para um produto individual */
export interface OmkarProductData {
  product_id?: string;
  productId?: string;
  id?: string;
  title?: string;
  subject?: string;
  description?: string;
  detail?: string;
  images?: string[];
  imagePathList?: string[];
  mainImage?: string;
  price?: number | string;
  salePrice?: number | string;
  minPrice?: number | string;
  originalPrice?: number | string;
  rating?: number;
  averageRating?: number;
  avgEvaluationRating?: number;
  reviewCount?: number;
  evaluationCount?: number;
  ordersCount?: number;
  orders?: number;
  salesCount?: number;
  stock?: number;
  totalStock?: number;
  totalAvailQuantity?: number;
  productUrl?: string;
  skuList?: OmkarSkuItem[];
  variations?: OmkarVariationGroup[];
  seller?: {
    storeName?: string;
    name?: string;
    rating?: number;
    positiveRate?: number;
    storeUrl?: string;
  };
}

export interface OmkarSkuItem {
  skuPropertyName?: string;
  name?: string;
  skuPropertyValue?: string;
  value?: string;
  stock?: number;
  availQuantity?: number;
  price?: number | string;
  skuId?: string;
  skuAttr?: string;
  image?: string;
  skuImage?: string;
}

export interface OmkarVariationGroup {
  name?: string;
  values?: Array<{
    name?: string;
    label?: string;
    value?: string;
    stock?: number;
    availQuantity?: number;
    price?: number | string;
    skuId?: string;
    skuAttr?: string;
    image?: string;
  }>;
}

/** Resultado de busca da API Omkar */
export interface OmkarSearchResult {
  results?: OmkarSearchItem[];
  products?: OmkarSearchItem[];
}

export interface OmkarSearchItem {
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

/** Dados normalizados do HybridClient (formato unificado) */
export interface HybridProductData {
  productId: string;
  title: string;
  description: string;
  images: string[];
  priceUSD: number;
  originalPriceUSD: number;
  rating: number;
  reviewCount: number;
  ordersCount: number;
  stock: number;
  variations: HybridVariation[];
  sellerInfo: {
    name: string;
    rating: number;
    storeUrl: string;
  } | null;
  productUrl: string;
  source: "omkar" | "ae_sdk" | "cache" | "none";
}

export interface HybridVariation {
  name: string;
  value: string;
  stock: number;
  sku?: string;
  image?: string;
  priceUSD?: number;
}

/** Resultado de busca do HybridClient */
export interface HybridSearchResult {
  items: HybridProductData[];
  total: number;
  page: number;
  source: "omkar" | "ae_sdk" | "none";
}
