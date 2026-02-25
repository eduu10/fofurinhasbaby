"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star, Heart, Truck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useState } from "react";

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  secondImage?: string | null;
  category?: string | null;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
  salesCount?: number;
  freeShipping?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isFavorited, setIsFavorited] = useState(false);

  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(product.compareAtPrice) - product.price) /
          Number(product.compareAtPrice)) *
          100,
      )
    : 0;

  const lowStock = product.stock > 0 && product.stock <= 5;

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

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    try {
      const key = "fofurinhas-favorites";
      const stored = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      if (isFavorited) {
        localStorage.setItem(key, JSON.stringify(stored.filter((id) => id !== product.id)));
      } else {
        stored.push(product.id);
        localStorage.setItem(key, JSON.stringify(stored));
      }
    } catch { /* ignore */ }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-baby-blue/20 hover:border-baby-blue/50 transition-all duration-300 hover:-translate-y-2 relative flex flex-col h-full group",
        className
      )}
    >
      {/* Badges */}
      <div className="absolute top-3 left-0 z-10 flex flex-col gap-1.5">
        {hasDiscount && (
          <div className="bg-gradient-offer text-white font-display font-bold py-1 px-3 rounded-r-full shadow-md text-xs">
            -{discountPercent}% OFF
          </div>
        )}
        {product.freeShipping && (
          <div className="bg-green-500 text-white font-bold py-1 px-3 rounded-r-full shadow-md text-[10px] flex items-center gap-1">
            <Truck size={10} /> FRETE GRATIS
          </div>
        )}
        {(product.salesCount || 0) > 50 && (
          <div className="bg-baby-pink text-white font-bold py-1 px-3 rounded-r-full shadow-md text-[10px]">
            TOP VENDA
          </div>
        )}
      </div>

      {/* Favorite Button */}
      <button
        onClick={handleFavorite}
        className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm hover:bg-white transition-all hover:scale-110"
        aria-label="Favoritar"
      >
        <Heart
          size={16}
          fill={isFavorited ? "currentColor" : "none"}
          className={isFavorited ? "text-red-500" : "text-gray-400"}
        />
      </button>

      {/* Image Container with Second Image Hover */}
      <Link
        href={`/products/${product.slug}`}
        className="relative h-64 overflow-hidden bg-gray-100"
      >
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            "object-cover transition-all duration-500",
            product.secondImage
              ? "group-hover:opacity-0 group-hover:scale-110"
              : "group-hover:scale-110"
          )}
          unoptimized
        />
        {product.secondImage && (
          <Image
            src={product.secondImage}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-all duration-500 opacity-0 group-hover:opacity-100 scale-110 group-hover:scale-100"
            unoptimized
          />
        )}
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
        {product.category && (
          <span className="mb-1 text-xs font-bold uppercase tracking-wider text-baby-blue">
            {product.category}
          </span>
        )}

        <Link href={`/products/${product.slug}`} className="mb-2">
          <h3 className="font-display text-lg font-bold text-gray-800 leading-tight line-clamp-2">
            {product.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-accent-yellow">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
          <span className="text-xs text-gray-500 font-bold">(4.8)</span>
        </div>

        {lowStock && (
          <div className="flex items-center gap-1 text-amber-600 text-xs font-bold mb-2 animate-pulse">
            <AlertTriangle size={12} />
            Apenas {product.stock} em estoque!
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-end gap-2 mb-1">
            {hasDiscount && (
              <span className="text-gray-400 text-sm line-through font-bold">
                {formatCurrency(product.compareAtPrice!)}
              </span>
            )}
            <span className="text-2xl font-display font-bold text-accent-orange">
              {formatCurrency(product.price)}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mb-3">
            ou 12x de {formatCurrency(product.price / 12)}
          </p>

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="w-full bg-gradient-buy text-white font-display font-bold text-lg py-3 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} strokeWidth={3} />
            {product.stock <= 0 ? "ESGOTADO" : "COMPRAR"}
          </button>
        </div>
      </div>
    </div>
  );
}
