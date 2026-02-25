import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            variation: true,
          },
        },
        history: { orderBy: { createdAt: "desc" } },
        address: true,
        coupon: true,
      },
    });

    if (!order) {
      return errorResponse("Pedido não encontrado", 404);
    }

    return successResponse(order);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin get order error:", error);
    return errorResponse("Erro ao buscar pedido", 500);
  }
}

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
    const { status, trackingCode, notes, paymentStatus, paymentId } = body;

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (trackingCode !== undefined) updateData.trackingCode = trackingCode;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentId) updateData.paymentId = paymentId;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
          history: { orderBy: { createdAt: "desc" } },
          address: true,
        },
      });

      if (status && status !== order.status) {
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status,
            note: body.statusNote || `Status atualizado para ${status}`,
          },
        });
      }

      return updatedOrder;
    });

    // Enviar e-mail ao cliente em background quando status ou tracking muda
    const customer = updated.user;
    if (customer?.email) {
      const newStatus = status && status !== order.status ? status : null;
      const newTracking =
        trackingCode !== undefined && trackingCode !== order.trackingCode ? trackingCode : null;

      if (newStatus === "CANCELLED") {
        sendOrderCancelledEmail({
          to: customer.email,
          customerName: customer.name,
          orderNumber: updated.orderNumber,
        }).catch((err) => console.error("[Email] Cancelamento falhou:", err));
      } else if (
        (newStatus === "SHIPPED" || (!newStatus && updated.status === "SHIPPED")) &&
        newTracking
      ) {
        // Status virou SHIPPED e/ou tracking code foi adicionado
        sendShippingNotificationEmail({
          to: customer.email,
          customerName: customer.name,
          orderNumber: updated.orderNumber,
          trackingCode: newTracking,
        }).catch((err) => console.error("[Email] Envio com rastreio falhou:", err));
      } else if (newStatus && STATUS_LABELS[newStatus]) {
        sendOrderStatusEmail({
          to: customer.email,
          customerName: customer.name,
          orderNumber: updated.orderNumber,
          status: newStatus,
          statusLabel: STATUS_LABELS[newStatus],
          message: STATUS_MESSAGES[newStatus] || `Status atualizado para ${STATUS_LABELS[newStatus]}.`,
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
    console.error("Admin update order error:", error);
    return errorResponse("Erro ao atualizar pedido", 500);
  }
}
