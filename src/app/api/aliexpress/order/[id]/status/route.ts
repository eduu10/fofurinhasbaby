import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getOrderStatus, isAliExpressConfigured } from "@/lib/aliexpress";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail, sendShippingNotificationEmail } from "@/lib/email";
import type { OrderStatus } from "@prisma/client";

/**
 * GET /api/aliexpress/order/[id]/status
 * Consulta status atualizado do pedido no AliExpress.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id) {
      return errorResponse("ID do pedido é obrigatório", 400);
    }

    // Buscar pedido local
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          ...(user.role === "ADMIN" ? [{}] : []),
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        aliexpressOrderId: true,
        trackingCode: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!order) {
      return errorResponse("Pedido não encontrado", 404);
    }

    // Se não tem ID do AliExpress, retorna só status local
    if (!order.aliexpressOrderId) {
      return successResponse({
        orderId: order.id,
        localStatus: order.status,
        aliexpressStatus: null,
        trackingCode: order.trackingCode,
        message: "Pedido ainda não enviado ao AliExpress",
      });
    }

    // Se AliExpress não configurado, retorna status local
    if (!isAliExpressConfigured()) {
      return successResponse({
        orderId: order.id,
        localStatus: order.status,
        aliexpressStatus: null,
        trackingCode: order.trackingCode,
        message: "Credenciais do AliExpress não configuradas",
      });
    }

    // Consultar status na API do AliExpress
    const aeStatus = await getOrderStatus(order.aliexpressOrderId);

    if (!aeStatus) {
      return successResponse({
        orderId: order.id,
        localStatus: order.status,
        aliexpressStatus: null,
        trackingCode: order.trackingCode,
        message: "Não foi possível consultar o AliExpress",
      });
    }

    // Atualizar status local se mudou
    const statusMap: Record<string, string> = {
      WAIT_SELLER_SEND_GOODS: "PROCESSING",
      SELLER_SEND_GOODS: "SHIPPED",
      WAIT_BUYER_ACCEPT_GOODS: "SHIPPED",
      BUYER_ACCEPT_GOODS: "DELIVERED",
      FINISH: "DELIVERED",
    };

    const newLocalStatus = statusMap[aeStatus.status] as OrderStatus | undefined;
    let updatedStatus: OrderStatus = order.status;
    let updatedTracking = order.trackingCode;
    let hasChanges = false;

    const orderUpdate: { status?: OrderStatus; trackingCode?: string } = {};

    if (newLocalStatus && newLocalStatus !== order.status) {
      orderUpdate.status = newLocalStatus;
      updatedStatus = newLocalStatus;
      hasChanges = true;
    }

    if (aeStatus.trackingCode && aeStatus.trackingCode !== order.trackingCode) {
      orderUpdate.trackingCode = aeStatus.trackingCode;
      updatedTracking = aeStatus.trackingCode;
      hasChanges = true;
    }

    if (hasChanges) {
      await prisma.order.update({
        where: { id: order.id },
        data: orderUpdate,
      });

      // Registrar mudança no histórico
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          status: updatedStatus,
          note: `Status AliExpress: ${aeStatus.statusTranslated}${
            aeStatus.trackingCode
              ? ` | Rastreio: ${aeStatus.trackingCode}`
              : ""
          }`,
        },
      });

      // Enviar notificação por email
      const statusLabels: Record<string, string> = {
        PROCESSING: "Em processamento",
        SHIPPED: "Enviado",
        DELIVERED: "Entregue",
      };
      const statusMessages: Record<string, string> = {
        PROCESSING: "Seu pedido está sendo preparado pelo fornecedor.",
        SHIPPED: "Seu pedido foi enviado e está a caminho!",
        DELIVERED: "Seu pedido foi entregue com sucesso!",
      };

      if (orderUpdate.status === "SHIPPED" && aeStatus.trackingCode) {
        await sendShippingNotificationEmail({
          to: order.user.email,
          customerName: order.user.name,
          orderNumber: order.orderNumber,
          trackingCode: aeStatus.trackingCode,
          trackingUrl: aeStatus.trackingUrl ?? undefined,
          carrier: aeStatus.logisticsService ?? undefined,
        });
      } else if (orderUpdate.status) {
        await sendOrderStatusEmail({
          to: order.user.email,
          customerName: order.user.name,
          orderNumber: order.orderNumber,
          status: updatedStatus,
          statusLabel: statusLabels[updatedStatus] || updatedStatus,
          message: statusMessages[updatedStatus] || "O status do seu pedido foi atualizado.",
          trackingCode: aeStatus.trackingCode ?? undefined,
          trackingUrl: aeStatus.trackingUrl ?? undefined,
        });
      }
    }

    return successResponse({
      orderId: order.id,
      localStatus: updatedStatus,
      aliexpressStatus: aeStatus,
      trackingCode: updatedTracking,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return errorResponse("Faça login para continuar", 401);
      }
    }
    console.error("AliExpress order status error:", error);
    return errorResponse("Erro ao consultar status do pedido", 500);
  }
}
