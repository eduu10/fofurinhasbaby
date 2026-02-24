"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, type CartItemType } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  className?: string;
}

export function CartItem({ item, className }: CartItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const unitPrice = item.variation?.price || item.product.price;
  const totalPrice = unitPrice * item.quantity;

  const canDecrease = item.quantity > item.product.minQuantity;
  const canIncrease = item.quantity < item.product.maxQuantity;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:gap-4 sm:p-4",
        className
      )}
    >
      {/* Product image */}
      <Link
        href={`/products/${item.product.slug}`}
        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-24 sm:w-24"
      >
        <Image
          src={item.product.image}
          alt={item.product.title}
          fill
          sizes="96px"
          className="object-cover"
        />
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        {/* Title & Variation */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/products/${item.product.slug}`}
              className="text-sm font-medium text-gray-800 transition-colors hover:text-pink-600 line-clamp-2"
            >
              {item.product.title}
            </Link>
            {item.variation && (
              <p className="mt-0.5 text-xs text-gray-500">
                {item.variation.name}: {item.variation.value}
              </p>
            )}
          </div>

          {/* Remove button */}
          <button
            onClick={() => removeItem(item.id)}
            className="flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label="Remover item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom: quantity + price */}
        <div className="mt-auto flex items-center justify-between pt-2">
          {/* Quantity controls */}
          <div className="flex items-center rounded-lg border border-gray-200">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={!canDecrease}
              className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="flex h-8 w-10 items-center justify-center border-x border-gray-200 text-sm font-medium text-gray-800">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={!canIncrease}
              className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(totalPrice)}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-gray-500">
                {formatCurrency(unitPrice)} cada
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
