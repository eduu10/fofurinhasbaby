import { getDropshipperClient, withRetry } from "./clients";
import type { OrderPayload, AEOrderStatus } from "./types";

// ---------------------------------------------------------------------------
// AliExpress order status -> translated labels (PT-BR)
// ---------------------------------------------------------------------------
const ORDER_STATUS_PT: Record<string, string> = {
  PLACE_ORDER_SUCCESS: "Pedido criado",
  IN_CANCEL: "Cancelamento solicitado",
  WAIT_SELLER_SEND_GOODS: "Em processamento",
  SELLER_SEND_GOODS: "Enviado",
  WAIT_BUYER_ACCEPT_GOODS: "A caminho",
  BUYER_ACCEPT_GOODS: "Entregue",
  FUND_PROCESSING: "Pagamento processando",
  FINISH: "Concluido",
  IN_FROZEN: "Congelado",
  IN_ISSUE: "Em disputa",
  CLOSED: "Fechado",
};

// ---------------------------------------------------------------------------
// 1. createDropshippingOrder
// ---------------------------------------------------------------------------

/**
 * Creates a dropshipping order on AliExpress.
 * Called after payment confirmation on our store.
 *
 * @returns AliExpress order ID(s) on success, or null on failure.
 */
export async function createDropshippingOrder(
  orderData: OrderPayload,
): Promise<{ orderId: string; orderIds: string[] } | null> {
  const client = getDropshipperClient();
  if (!client) {
    console.error("[AE] Cannot create order: client not configured");
    return null;
  }

  const address = {
    address: orderData.address.address,
    address2: orderData.address.address2,
    city: orderData.address.city,
    province: orderData.address.province,
    country: orderData.address.country || "BR",
    full_name: orderData.address.fullName,
    mobile_no: orderData.address.phone,
    zip: orderData.address.zipCode,
    cpf: orderData.address.cpf,
    phone_country: "+55",
    locale: "pt_BR",
  };

  const productItems = orderData.items.map((item) => ({
    product_id: item.productId,
    product_count: item.quantity,
    sku_attr: item.skuAttr,
    logistics_service_name: item.logisticsServiceName || "CAINIAO_STANDARD",
    order_memo: item.orderMemo,
  }));

  const result = await withRetry(() =>
    client.createOrder({
      logistics_address: address,
      product_items: productItems,
    }),
  );

  if (!result.ok) {
    console.error("[AE] createOrder error:", "message" in result ? result.message : "unknown");
    return null;
  }

  const data = result.data as unknown as Record<string, unknown>;

  // The API can return multiple order IDs if items come from different sellers
  const orderIds: string[] = [];

  const orderList = data.order_list as Record<string, unknown>[] | undefined;
  if (orderList) {
    for (const o of orderList) {
      const id = o.order_id ?? o.orderId;
      if (id) orderIds.push(String(id));
    }
  }

  // Single order ID fallback
  const singleId =
    (data.order_id as string) ??
    (data.orderId as string) ??
    orderIds[0] ??
    "";

  return {
    orderId: singleId,
    orderIds: orderIds.length > 0 ? orderIds : singleId ? [singleId] : [],
  };
}

// ---------------------------------------------------------------------------
// 2. getOrderStatus
// ---------------------------------------------------------------------------

/**
 * Fetches the current status of an AliExpress order.
 */
export async function getOrderStatus(
  orderId: string,
): Promise<AEOrderStatus | null> {
  const client = getDropshipperClient();
  if (!client) return null;

  const result = await withRetry(() =>
    client.orderDetails({ order_id: Number(orderId) }),
  );

  if (!result.ok) {
    console.error("[AE] orderDetails error:", "message" in result ? result.message : "unknown");
    return null;
  }

  const data = result.data as unknown as Record<string, unknown>;

  const status = (data.order_status as string) ?? "UNKNOWN";
  const logisticsInfo = data.logistics_info_list as
    | Record<string, unknown>[]
    | undefined;

  let trackingCode: string | undefined;
  let trackingUrl: string | undefined;
  let logisticsService: string | undefined;

  if (logisticsInfo && logisticsInfo.length > 0) {
    const info = logisticsInfo[0];
    trackingCode = (info.logistics_no as string) || undefined;
    trackingUrl = (info.logistics_track_url as string) || undefined;
    logisticsService = (info.logistics_service as string) || undefined;
  }

  return {
    orderId: String(data.order_id ?? orderId),
    status,
    statusTranslated: ORDER_STATUS_PT[status] ?? status,
    trackingCode,
    trackingUrl,
    logisticsService,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 3. syncOrderTracking
// ---------------------------------------------------------------------------

/**
 * Fetches the latest tracking information for an order.
 * Returns tracking code and carrier name.
 */
export async function syncOrderTracking(
  orderId: string,
): Promise<{
  trackingCode: string | null;
  carrier: string | null;
  trackingUrl: string | null;
  status: string;
} | null> {
  const orderStatus = await getOrderStatus(orderId);
  if (!orderStatus) return null;

  return {
    trackingCode: orderStatus.trackingCode ?? null,
    carrier: orderStatus.logisticsService ?? null,
    trackingUrl: orderStatus.trackingUrl ?? null,
    status: orderStatus.statusTranslated,
  };
}
