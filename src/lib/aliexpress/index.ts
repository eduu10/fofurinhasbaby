// ---------------------------------------------------------------------------
// AliExpress Integration – public API
// ---------------------------------------------------------------------------

// Clients & helpers
export {
  isAliExpressConfigured,
  getDropshipperClient,
  getAffiliateClient,
  getTrackingId,
  withRetry,
  getUsdToBrlRate,
  convertToBrl,
} from "./clients";

// Hybrid Client (Omkar + ae_sdk + Cache)
export {
  AliExpressHybridClient,
  getHybridClient,
} from "./client";

// Products
export {
  getProductDetails,
  searchProducts,
  getHotProducts,
  getProductsByCategory,
  calculateShipping,
} from "./products";

// Orders
export {
  createDropshippingOrder,
  getOrderStatus,
  syncOrderTracking,
} from "./orders";

// Affiliate
export {
  generateAffiliateLink,
  generateAffiliateLinksBatch,
  getAffiliateFeaturedProducts,
} from "./affiliate";

// Transformer
export {
  transformToProduct,
  detectCategory,
  findOrDetectCategory,
} from "./transformer";

// Types
export type {
  AEProduct,
  AEVariation,
  AEVariationValue,
  AEShippingOption,
  OrderPayload,
  OrderItemPayload,
  AEOrderStatus,
  ProductSearchFilters,
  PaginatedResult,
  OmkarProductData,
  OmkarSearchResult,
  OmkarSearchItem,
  HybridProductData,
  HybridVariation,
  HybridSearchResult,
} from "./types";
