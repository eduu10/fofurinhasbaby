"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingCart, Star, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface BestsellerProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  salesCount: number;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
}

interface BestsellerCarouselProps {
  products: BestsellerProduct[];
}

export function BestsellerCarousel({ products }: BestsellerCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-accent-orange/5 to-baby-pink/5 py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-accent-orange font-bold tracking-wider uppercase text-sm flex items-center gap-1">
              <Flame size={16} className="text-accent-orange" /> Em tempo real
            </span>
            <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
              Mais{" "}
              <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">
                Vendidos
              </span>
            </h2>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              aria-label="Rolar para direita"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => {
            const hasDiscount =
              product.compareAtPrice && product.compareAtPrice > product.price;
            const discountPercent = hasDiscount
              ? Math.round(
                  ((product.compareAtPrice! - product.price) /
                    product.compareAtPrice!) *
                    100,
                )
              : 0;

            return (
              <div
                key={product.id}
                className="flex-shrink-0 w-[75vw] sm:w-[260px] snap-start bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-transparent hover:border-accent-orange/30 transition-all group"
              >
                {/* TOP VENDA badge */}
                <div className="relative">
                  <Link href={`/products/${product.slug}`}>
                    <div className="relative h-52 overflow-hidden bg-gray-100">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="260px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        unoptimized
                      />
                    </div>
                  </Link>
                  <div className="absolute top-3 left-0 bg-gradient-to-r from-red-500 to-orange-500 text-white font-display font-bold py-1 px-3 rounded-r-full shadow-md text-xs flex items-center gap-1">
                    <Flame size={12} /> TOP VENDA
                  </div>
                  {discountPercent > 0 && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white font-bold py-0.5 px-2 rounded-full text-xs">
                      -{discountPercent}%
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-display font-bold text-gray-800 text-sm leading-tight line-clamp-2 mb-2 hover:text-accent-orange transition-colors">
                      {product.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-accent-yellow">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {product.salesCount}+ vendas
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-x-2 mb-3">
                    {hasDiscount && (
                      <span className="text-gray-500 text-xs line-through">
                        {formatCurrency(product.compareAtPrice!)}
                      </span>
                    )}
                    <span className="text-xl font-display font-bold text-accent-orange">
                      {formatCurrency(product.price)}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      addItem(
                        {
                          id: product.id,
                          title: product.title,
                          price: product.price,
                          compareAtPrice: product.compareAtPrice,
                          image: product.image,
                          slug: product.slug,
                          stock: product.stock,
                          minQuantity: product.minQuantity,
                          maxQuantity: product.maxQuantity,
                        },
                        product.minQuantity || 1,
                      )
                    }
                    className="w-full bg-gradient-buy text-white font-display font-bold py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <ShoppingCart size={16} strokeWidth={3} />
                    COMPRAR
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/products?sort=sales"
            className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors"
          >
            Ver todos os mais vendidos &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
