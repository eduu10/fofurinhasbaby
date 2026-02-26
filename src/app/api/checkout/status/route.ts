import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { isAsaasConfigured, getPayment } from "@/lib/asaas";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return errorResponse("orderId e obrigatorio", 400);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentId: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
      },
    });

    if (!order) {
      return errorResponse("Pedido nao encontrado", 404);
    }

    // If we have a payment ID and Asaas is configured, check real-time status
    if (order.paymentId && isAsaasConfigured()) {
      try {
        const asaasPayment = await getPayment(order.paymentId);
        if (asaasPayment.status !== order.paymentStatus) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: asaasPayment.status },
          });
          order.paymentStatus = asaasPayment.status;
        }
      } catch {
        // If Asaas check fails, return cached status
      }
    }

    return successResponse({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: Number(order.total),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Nao autenticado", 401);
    }
    console.error("Check payment status error:", error);
    return errorResponse("Erro ao verificar status", 500);
  }
}
