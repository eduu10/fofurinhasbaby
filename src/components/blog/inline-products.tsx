import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star, Tag } from "lucide-react";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface InlineProductsProps {
  title?: string;
  skip?: number;
}

export async function InlineProducts({
  title = "Aproveite e Confira",
  skip = 0,
}: InlineProductsProps) {
  let products: Array<{
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    image: string;
    category: string | null;
  }> = [];

  try {
    const raw = await prisma.product.findMany({
      where: { isActive: true, isDraft: false },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      orderBy: { salesCount: "desc" },
      skip,
      take: 3,
    });

    products = raw.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      image: p.images?.[0]?.url || "/placeholder.jpg",
      category: p.category?.name || null,
    }));
  } catch {
    return null;
  }

  if (products.length === 0) return null;

  return (
    <div className="not-prose my-10 rounded-2xl bg-gradient-to-r from-baby-pink/5 via-white to-baby-blue/5 border-2 border-baby-pink/15 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag size={18} className="text-accent-orange" />
        <h3 className="font-display text-lg font-bold text-gray-800">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {products.map((p) => {
          const discount = p.compareAtPrice
            ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
            : 0;

          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 200px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{discount}% OFF
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                {p.category && (
                  <span className="text-[10px] font-bold text-baby-blue uppercase tracking-wider mb-1">
                    {p.category}
                  </span>
                )}
                <h4 className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-baby-pink transition-colors leading-tight mb-2">
                  {p.title}
                </h4>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-[10px] text-gray-400">(4.8)</span>
                </div>
                <div className="mt-auto">
                  {p.compareAtPrice && (
                    <span className="text-xs text-gray-400 line-through block">
                      {formatCurrency(p.compareAtPrice)}
                    </span>
                  )}
                  <span className="text-base font-bold text-gray-900">
                    {formatCurrency(p.price)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold py-2 rounded-lg group-hover:from-amber-500 group-hover:to-orange-600 transition-all">
                  <ShoppingCart size={13} />
                  COMPRAR
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
