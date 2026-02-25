import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getUsdToBrlRate } from "@/lib/aliexpress";
import { isMarginBelowMinimum } from "@/lib/pricing/calculator";

/**
 * GET /api/admin/dropship-metrics
 *
 * Retorna métricas de rentabilidade e alertas para o dashboard admin.
 */
export async function GET() {
  try {
    await requireAdmin();

    const exchangeRate = await getUsdToBrlRate();

    // Buscar todos os produtos ativos com dados de custo
    const products = await prisma.product.findMany({
      where: { isActive: true, isDraft: false },
      select: {
        id: true,
        title: true,
        price: true,
        costPriceUSD: true,
        costPrice: true,
        stock: true,
        outOfStock: true,
        salesCount: true,
        images: { select: { url: true }, take: 1 },
      },
    });

    // Calcular métricas de rentabilidade
    let totalRevenueBRL = 0;
    let totalCostUSD = 0;
    let productsOutOfStock = 0;
    let productsLowMargin = 0;
    let productsBrokenImage = 0;

    const productMetrics: {
      id: string;
      title: string;
      marginPercent: number;
      salesCount: number;
      revenue: number;
    }[] = [];

    for (const product of products) {
      const priceBRL = Number(product.price);
      const costUSD = product.costPriceUSD ?? 0;
      const revenue = priceBRL * product.salesCount;
      totalRevenueBRL += revenue;
      totalCostUSD += costUSD * product.salesCount;

      // Verificar estoque
      if (product.outOfStock || product.stock === 0) {
        productsOutOfStock++;
      }

      // Verificar imagens
      if (!product.images[0]?.url || product.images[0].url.includes("placehold")) {
        productsBrokenImage++;
      }

      // Calcular margem
      let marginPercent = 0;
      if (costUSD > 0) {
        const totalCostBRL = costUSD * exchangeRate * 1.238; // +IOF +Imposto
        const profit = priceBRL - totalCostBRL;
        marginPercent = totalCostBRL > 0 ? (profit / totalCostBRL) * 100 : 0;

        if (marginPercent < 30) {
          productsLowMargin++;
        }
      }

      if (product.salesCount > 0 || costUSD > 0) {
        productMetrics.push({
          id: product.id,
          title: product.title,
          marginPercent,
          salesCount: product.salesCount,
          revenue,
        });
      }
    }

    // Top produtos por margem (ordenar por margem %, apenas com vendas)
    const topProducts = productMetrics
      .sort((a, b) => b.marginPercent - a.marginPercent)
      .slice(0, 10);

    // Margem líquida geral
    const estimatedCostBRL = totalCostUSD * exchangeRate * 1.238;
    const estimatedMarginBRL = totalRevenueBRL - estimatedCostBRL;
    const marginPercent = estimatedCostBRL > 0
      ? (estimatedMarginBRL / estimatedCostBRL) * 100
      : 0;

    // Uso da API Omkar
    let apiUsage = null;
    try {
      const month = new Date().toISOString().slice(0, 7);
      const usage = await prisma.apiUsage.findFirst({
        where: { service: "omkar", month },
      });
      const limit = parseInt(process.env.OMKAR_MONTHLY_LIMIT ?? "5000", 10);
      const used = usage?.requestCount ?? 0;
      apiUsage = {
        used,
        limit,
        percentage: Math.round((used / limit) * 100),
      };
    } catch {
      // Tabela pode não existir ainda
    }

    return NextResponse.json({
      success: true,
      data: {
        estimatedCostUSD: totalCostUSD,
        estimatedMarginBRL: Math.round(estimatedMarginBRL * 100) / 100,
        marginPercent: Math.round(marginPercent * 100) / 100,
        productsOutOfStock,
        productsLowMargin,
        productsBrokenImage,
        topProducts,
        apiUsage,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Dropship Metrics] Erro:", error);
    return NextResponse.json({ success: true, data: null });
  }
}
