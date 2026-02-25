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
} from "./types";
