import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

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
