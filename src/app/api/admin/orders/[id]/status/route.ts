import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import type { OrderStatus } from "@prisma/client";
import {
  sendOrderStatusEmail,
  sendOrderCancelledEmail,
  sendShippingNotificationEmail,
} from "@/lib/email";

const STATUS_LABELS: Record<string, string> = {
  PAID: "Pago",
  PROCESSING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const STATUS_MESSAGES: Record<string, string> = {
  PAID: "Seu pagamento foi confirmado e o pedido está sendo preparado.",
  PROCESSING: "Seu pedido está sendo preparado para envio.",
  SHIPPED: "Seu pedido foi enviado e está a caminho!",
  DELIVERED: "Seu pedido foi entregue. Obrigada pela compra! 💕",
  CANCELLED: "Seu pedido foi cancelado. Entre em contato se tiver dúvidas.",
};

const VALID_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return errorResponse("Pedido não encontrado", 404);
    }

    const body = await request.json();
    const { status, note } = body;

    if (!status) {
      return errorResponse("Status é obrigatório", 400);
    }

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Status inválido. Valores permitidos: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    if (status === order.status) {
      return errorResponse("O pedido já está com este status", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Create history entry
      await tx.orderHistory.create({
        data: {
          orderId: id,
          status,
          note: note || `Status atualizado de ${order.status} para ${status}`,
        },
      });

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
        include: {
          history: { orderBy: { createdAt: "desc" } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // If cancelled, restore stock
      if (status === "CANCELLED" && order.status !== "CANCELLED") {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
        });

        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              salesCount: { decrement: item.quantity },
            },
          });
        }
      }

      return updatedOrder;
    });

    // Enviar e-mail ao cliente em background
    const customer = updated.user;
    if (customer?.email) {
      // trackingCode não é retornado no include, busca do order original
      const trackingCode = order.trackingCode ?? undefined;

      if (status === "CANCELLED") {
        sendOrderCancelledEmail({
          to: customer.email,
          customerName: customer.name,
          orderNumber: updated.orderNumber,
          reason: note,
        }).catch((err) => console.error("[Email] Cancelamento falhou:", err));
      } else if (status === "SHIPPED" && trackingCode) {
        sendShippingNotificationEmail({
          to: customer.email,
          customerName: customer.name,
          orderNumber: updated.orderNumber,
          trackingCode,
        }).catch((err) => console.error("[Email] Envio falhou:", err));
      } else if (STATUS_LABELS[status]) {
        sendOrderStatusEmail({
          to: customer.email,
          customerName: customer.name,
          orderNumber: updated.orderNumber,
          status,
          statusLabel: STATUS_LABELS[status],
          message: STATUS_MESSAGES[status] || `Status atualizado para ${STATUS_LABELS[status]}.`,
        }).catch((err) => console.error("[Email] Status update falhou:", err));
      }
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Update order status error:", error);
    return errorResponse("Erro ao atualizar status do pedido", 500);
  }
}
