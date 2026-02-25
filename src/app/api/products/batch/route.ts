import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body.ids as string[];

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids.slice(0, 50) },
        isActive: true,
        isDraft: false,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    const data = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      image: p.images[0]?.url || "/placeholder.png",
      stock: p.stock,
      minQuantity: p.minQuantity ?? 1,
      maxQuantity: p.maxQuantity ?? 99,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
