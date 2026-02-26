import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star, Sparkles } from "lucide-react";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function SidebarProducts() {
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
      take: 4,
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
    <div className="bg-white rounded-2xl shadow-sm border border-baby-pink/15 overflow-hidden">
      <div className="bg-gradient-to-r from-baby-pink to-pink-400 px-5 py-3 flex items-center gap-2">
        <Sparkles size={16} className="text-white" />
        <h3 className="font-display text-sm font-bold text-white">
          Mais Vendidos
        </h3>
      </div>
      <div className="p-3 space-y-3">
        {products.map((p) => {
          const discount = p.compareAtPrice
            ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
            : 0;

          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group flex gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="64px"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  unoptimized
                />
                {discount > 0 && (
                  <span className="absolute top-0.5 left-0.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    -{discount}%
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-800 line-clamp-2 group-hover:text-baby-pink transition-colors leading-tight">
                  {p.title}
                </h4>
                <div className="flex items-center gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={8} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {p.compareAtPrice && (
                    <span className="text-[10px] text-gray-400 line-through">
                      {formatCurrency(p.compareAtPrice)}
                    </span>
                  )}
                  <span className="text-sm font-bold text-accent-orange">
                    {formatCurrency(p.price)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="px-3 pb-3">
        <Link
          href="/products"
          className="flex items-center justify-center gap-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold py-2.5 rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all"
        >
          <ShoppingCart size={14} />
          Ver Todos os Produtos
        </Link>
      </div>
    </div>
  );
}
