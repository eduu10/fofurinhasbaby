"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  category?: string | null;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
}

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock <= 0) return;

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
      product.minQuantity || 1
    );
  };

  return (
    <div
      className={cn(
        "bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-baby-blue/20 hover:border-baby-blue/50 transition-all duration-300 hover:-translate-y-2 relative flex flex-col h-full group",
        className
      )}
    >
      {/* Badge */}
      {hasDiscount && (
        <div className="absolute top-4 left-0 bg-gradient-offer text-white font-display font-bold py-1 px-4 rounded-r-full shadow-md z-10 text-sm transform -rotate-2">
          OFERTA
        </div>
      )}

      {/* Image Container */}
      <Link
        href={`/products/${product.slug}`}
        className="relative h-64 overflow-hidden bg-gray-100"
      >
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800">
              Esgotado
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Category */}
        {product.category && (
          <span className="mb-1 text-xs font-bold uppercase tracking-wider text-baby-blue">
            {product.category}
          </span>
        )}

        {/* Title */}
        <Link
          href={`/products/${product.slug}`}
          className="mb-2"
        >
          <h3 className="font-display text-lg font-bold text-gray-800 leading-tight line-clamp-2">
            {product.title}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex text-accent-yellow">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
          <span className="text-xs text-gray-500 font-bold">(4.8)</span>
        </div>

        {/* Price & Action */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-end gap-2 mb-3">
            {hasDiscount && (
              <span className="text-gray-400 text-sm line-through font-bold">
                {formatCurrency(product.compareAtPrice!)}
              </span>
            )}
            <span className="text-2xl font-display font-bold text-accent-orange">
              {formatCurrency(product.price)}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="w-full bg-gradient-buy text-white font-display font-bold text-lg py-3 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} strokeWidth={3} />
            {product.stock <= 0 ? "ESGOTADO" : "COMPRAR AGORA"}
          </button>
        </div>
      </div>
    </div>
  );
}
