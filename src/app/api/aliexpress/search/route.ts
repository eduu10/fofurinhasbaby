import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { searchProducts, isAliExpressConfigured } from "@/lib/aliexpress";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/aliexpress/search
 * Busca produtos no AliExpress por keyword com filtros.
 * Quando as credenciais não estão configuradas, busca no banco local.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      keyword,
      page = 1,
      category,
      minPrice,
      maxPrice,
      sort = "LAST_VOLUME_DESC",
      pageSize = 20,
    } = body;

    if (!keyword && !category) {
      return errorResponse("Informe uma palavra-chave ou categoria", 400);
    }

    // Se AliExpress configurado, buscar da API real
    if (isAliExpressConfigured()) {
      const result = await searchProducts(
        {
          keyword,
          categoryId: category,
          minPrice: minPrice ? Math.round(minPrice * 100) : undefined,
          maxPrice: maxPrice ? Math.round(maxPrice * 100) : undefined,
          sort,
          page,
          pageSize,
        },
      );

      return successResponse(result);
    }

    // Fallback: buscar do banco local (dados mockados/importados)
    const where: Record<string, unknown> = {
      isActive: true,
      isDraft: false,
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, number>).gte = minPrice;
      if (maxPrice) (where.price as Record<string, number>).lte = maxPrice;
    }

    const orderBy: Record<string, string> = {};
    switch (sort) {
      case "SALE_PRICE_ASC":
        orderBy.price = "asc";
        break;
      case "SALE_PRICE_DESC":
        orderBy.price = "desc";
        break;
      case "LAST_VOLUME_DESC":
        orderBy.salesCount = "desc";
        break;
      default:
        orderBy.createdAt = "desc";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await prisma.product.count({ where: where as any });

    const products = await prisma.product.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 4 },
        category: { select: { id: true, name: true, slug: true } },
        variations: true,
      },
    });

    return successResponse({
      items: products,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error("AliExpress search error:", error);
    return errorResponse("Erro ao buscar produtos", 500);
  }
}
