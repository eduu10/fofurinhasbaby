import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isDraft: false,
      },
      take: 8,
      orderBy: { salesCount: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        variations: true,
      },
    });

    return successResponse(products);
  } catch (error) {
    console.error("Bestsellers error:", error);
    return errorResponse("Erro ao buscar mais vendidos", 500);
  }
}
