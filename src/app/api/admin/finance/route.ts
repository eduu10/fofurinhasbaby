import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const acceptHeader = request.headers.get("Accept") || "";

    const where: Prisma.OrderWhereInput = {
      status: { not: "CANCELLED" },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, costPrice: true },
            },
          },
        },
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = orders.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDiscount = orders.reduce((sum, order) => sum + Number(order.discount), 0);
    const totalShipping = orders.reduce((sum, order) => sum + Number(order.shipping), 0);

    // Calculate profit (revenue - cost)
    let totalCost = 0;
    const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};

    for (const order of orders) {
      for (const item of order.items) {
        const cost = item.product.costPrice ? Number(item.product.costPrice) * item.quantity : 0;
        totalCost += cost;

        const key = item.productId;
        if (!productSales[key]) {
          productSales[key] = {
            title: item.title,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += Number(item.price) * item.quantity;
      }
    }

    const totalProfit = totalRevenue - totalCost;

    // Top products by revenue
    const topProducts = Object.entries(productSales)
      .map(([productId, data]) => ({
        productId,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      where: startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
            },
          }
        : undefined,
    });

    const report = {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      averageTicket: parseFloat(averageTicket.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalShipping: parseFloat(totalShipping.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      profitMargin: totalRevenue > 0
        ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(2))
        : 0,
      topProducts,
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      period: {
        startDate: startDate || "all",
        endDate: endDate || "all",
      },
    };

    // Dashboard extras
    const [totalProducts, pendingOrders, recentOrders] = await Promise.all([
      prisma.product.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    Object.assign(report, {
      totalProducts,
      pendingOrders,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total).toString(),
      })),
    });

    // CSV export
    if (acceptHeader.includes("text/csv")) {
      const csvLines = [
        "Métrica,Valor",
        `Receita Total,${report.totalRevenue}`,
        `Total de Pedidos,${report.totalOrders}`,
        `Ticket Médio,${report.averageTicket}`,
        `Total Descontos,${report.totalDiscount}`,
        `Total Frete,${report.totalShipping}`,
        `Custo Total,${report.totalCost}`,
        `Lucro Total,${report.totalProfit}`,
        `Margem de Lucro %,${report.profitMargin}`,
        "",
        "Top Produtos",
        "Produto,Quantidade,Receita",
        ...topProducts.map(
          (p) => `"${p.title}",${p.quantity},${p.revenue.toFixed(2)}`
        ),
      ];

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-financeiro-${startDate || "total"}-${endDate || "total"}.csv"`,
        },
      });
    }

    return successResponse(report);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Finance report error:", error);
    return errorResponse("Erro ao gerar relatório financeiro", 500);
  }
}
