import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
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

    // Regular users can only see their own orders
    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return errorResponse("Acesso negado", 403);
    }

    return successResponse(order);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Get order error:", error);
    return errorResponse("Erro ao buscar pedido", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role !== "ADMIN") {
      return errorResponse("Acesso negado", 403);
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return errorResponse("Pedido não encontrado", 404);
    }

    const body = await request.json();
    const { status, trackingCode, notes, paymentStatus } = body;

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (trackingCode !== undefined) updateData.trackingCode = trackingCode;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
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
            note: `Status atualizado para ${status}`,
          },
        });
      }

      return updatedOrder;
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Update order error:", error);
    return errorResponse("Erro ao atualizar pedido", 500);
  }
}
