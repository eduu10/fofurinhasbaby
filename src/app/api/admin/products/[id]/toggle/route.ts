import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
      select: {
        id: true,
        title: true,
        isActive: true,
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
    console.error("Toggle product error:", error);
    return errorResponse("Erro ao alterar status do produto", 500);
  }
}
