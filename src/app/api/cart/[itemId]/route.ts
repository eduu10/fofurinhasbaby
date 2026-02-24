import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return errorResponse("Quantidade deve ser pelo menos 1", 400);
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cartItem) {
      return errorResponse("Item não encontrado no carrinho", 404);
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        },
        variation: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update cart item error:", error);
    return errorResponse("Erro ao atualizar item do carrinho", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cartItem) {
      return errorResponse("Item não encontrado no carrinho", 404);
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    return successResponse({ message: "Item removido do carrinho" });
  } catch (error) {
    console.error("Delete cart item error:", error);
    return errorResponse("Erro ao remover item do carrinho", 500);
  }
}
