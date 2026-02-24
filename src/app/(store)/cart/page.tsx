"use client";

import { useCartStore } from "@/stores/cart-store";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import Link from "next/link";

export default function CartPage() {
  const { items } = useCartStore();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">Carrinho</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-6xl">🛒</div>
          <h3 className="text-lg font-semibold text-gray-800">
            Seu carrinho está vazio
          </h3>
          <p className="mt-2 text-gray-500">
            Adicione produtos ao carrinho para continuar comprando.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-full bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Ver Produtos
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Cart Items */}
          <div className="flex-1">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <aside className="w-full lg:w-96">
            <CartSummary />
          </aside>
        </div>
      )}
    </div>
  );
}
