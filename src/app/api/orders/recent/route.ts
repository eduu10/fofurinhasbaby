import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orders/recent
 *
 * Retorna os pedidos mais recentes para exibição de social proof.
 * Dados anonimizados: apenas primeiro nome + cidade.
 */
export async function GET() {
  try {
    const recentOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      select: {
        createdAt: true,
        user: {
          select: { name: true },
        },
        address: {
          select: { city: true },
        },
        items: {
          select: {
            title: true,
            image: true,
            product: {
              select: { slug: true },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const notifications = recentOrders.map((order) => {
      const firstName = order.user.name.split(" ")[0];
      const city = order.address.city;
      const product = order.items[0];
      const minutesAgo = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60),
      );

      return {
        name: firstName,
        city,
        product: product?.title ?? "Produto Fofurinhas",
        image: product?.image ?? null,
        slug: product?.product?.slug ?? null,
        minutesAgo: Math.min(minutesAgo, 180), // Máximo 3h
      };
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
