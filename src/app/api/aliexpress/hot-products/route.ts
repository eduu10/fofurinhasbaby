import { successResponse, errorResponse } from "@/lib/api";
import {
  getHotProducts,
  isAliExpressConfigured,
} from "@/lib/aliexpress";
import { prisma } from "@/lib/prisma";

// Keywords para buscar produtos baby trending
const BABY_KEYWORDS = [
  "baby clothes",
  "baby toys",
  "baby feeding",
  "baby hygiene",
  "baby accessories",
  "baby monitor",
];

/**
 * GET /api/aliexpress/hot-products
 * Retorna os 12 produtos mais vendidos em categorias baby.
 * Cache de 6 horas via ISR.
 */
export async function GET() {
  try {
    // Se AliExpress configurado, buscar da API real
    if (isAliExpressConfigured()) {
      // Buscar de cada keyword e juntar os resultados
      const allProducts = [];

      for (const keyword of BABY_KEYWORDS) {
        const products = await getHotProducts(keyword, 4);
        allProducts.push(...products);
      }

      // Deduplicar e limitar a 12
      const seen = new Set<string>();
      const unique = allProducts.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      return successResponse(unique.slice(0, 12));
    }

    // Fallback: buscar do banco local os mais vendidos
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isDraft: false,
      },
      orderBy: { salesCount: "desc" },
      take: 12,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 2 },
        category: { select: { id: true, name: true, slug: true } },
        variations: true,
      },
    });

    return successResponse(products);
  } catch (error) {
    console.error("Hot products error:", error);
    return errorResponse("Erro ao buscar produtos em alta", 500);
  }
}

// ISR: revalidar a cada 6 horas
export const revalidate = 21600;
