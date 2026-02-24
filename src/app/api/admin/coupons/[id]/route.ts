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

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!coupon) {
      return errorResponse("Cupom não encontrado", 404);
    }

    return successResponse(coupon);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin get coupon error:", error);
    return errorResponse("Erro ao buscar cupom", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return errorResponse("Cupom não encontrado", 404);
    }

    const body = await request.json();
    const { code, type, value, minPurchase, maxUses, expiresAt, isActive } = body;

    if (code && code.toUpperCase().trim() !== coupon.code) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase().trim() },
      });
      if (existingCoupon) {
        return errorResponse("Já existe um cupom com este código", 409);
      }
    }

    if (type && !["FIXED", "PERCENTAGE"].includes(type)) {
      return errorResponse("Tipo deve ser FIXED ou PERCENTAGE", 400);
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase().trim() : undefined,
        type: type ?? undefined,
        value: value ?? undefined,
        minPurchase: minPurchase !== undefined ? minPurchase : undefined,
        maxUses: maxUses !== undefined ? maxUses : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        isActive: isActive ?? undefined,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin update coupon error:", error);
    return errorResponse("Erro ao atualizar cupom", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!coupon) {
      return errorResponse("Cupom não encontrado", 404);
    }

    if (coupon._count.orders > 0) {
      // Soft delete - just deactivate
      await prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
      return successResponse({ message: "Cupom desativado (possui pedidos associados)" });
    }

    await prisma.coupon.delete({ where: { id } });

    return successResponse({ message: "Cupom excluído com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin delete coupon error:", error);
    return errorResponse("Erro ao excluir cupom", 500);
  }
}
