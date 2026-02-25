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
