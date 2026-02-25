import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { getProductDetails, isAliExpressConfigured } from "@/lib/aliexpress";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/aliexpress/product/[id]
 * Retorna detalhes completos de um produto do AliExpress.
 * Quando credenciais não configuradas, busca do banco local.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return errorResponse("ID do produto é obrigatório", 400);
    }

    // Se AliExpress configurado, buscar da API real
    if (isAliExpressConfigured()) {
      const product = await getProductDetails(id);

      if (!product) {
        return errorResponse("Produto não encontrado", 404);
      }

      return successResponse(product);
    }

    // Fallback: buscar do banco local pelo aliexpressId ou id
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { aliexpressId: id },
          { id },
        ],
        isActive: true,
        isDraft: false,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
        variations: true,
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { name: true, image: true } },
          },
        },
      },
    });

    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    return successResponse(product);
  } catch (error) {
    console.error("AliExpress product detail error:", error);
    return errorResponse("Erro ao buscar detalhes do produto", 500);
  }
}
