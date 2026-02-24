"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        "group relative flex flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition-all duration-300 hover:shadow-pastel hover:-translate-y-1",
        className
      )}
    >
      {/* Image container */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square overflow-hidden bg-gray-100"
      >
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
        {hasDiscount && (
          <Badge
            variant="offer"
            className="absolute left-2 top-2 z-10"
          >
            OFERTA
          </Badge>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800">
              Esgotado
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Category */}
        {product.category && (
          <span className="mb-1 text-xs font-medium uppercase tracking-wider text-pink-500">
            {product.category}
          </span>
        )}

        {/* Title */}
        <Link
          href={`/products/${product.slug}`}
          className="mb-2 line-clamp-2 text-sm font-medium text-gray-800 transition-colors hover:text-pink-600"
        >
          {product.title}
        </Link>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-bold text-pink-600">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatCurrency(product.compareAtPrice!)}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
        >
          <ShoppingCart className="h-4 w-4" />
          {product.stock <= 0 ? "Esgotado" : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
