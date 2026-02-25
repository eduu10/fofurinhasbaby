"use client";

import { useCartStore } from "@/stores/cart-store";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Truck, Plus, ShoppingBag } from "lucide-react";

// Limite para frete grátis (em centavos BRL, convertido para reais)
const FREE_SHIPPING_THRESHOLD = 149.9;

interface UpsellProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: { url: string }[];
}

export default function CartPage() {
  const { items, getSubtotal, addItem } = useCartStore();
  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([]);

  const subtotal = getSubtotal();
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Buscar produtos de upsell baseados nos itens do carrinho
  useEffect(() => {
    if (items.length === 0) return;

    const productIds = items.map((item) => item.id).join(",");
    fetch(`/api/products/bestsellers?limit=3&exclude=${productIds}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setUpsellProducts(
            json.data.slice(0, 3).map((p: Record<string, unknown>) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              price: Number(p.price),
              compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
              images: (p.images as { url: string }[]) || [],
            })),
          );
        }
      })
      .catch(() => {
        // Silencioso para o usuário
      });
  }, [items]);

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
          {/* Cart Items + Upsell */}
          <div className="flex-1 space-y-6">
            {/* Barra de progresso frete grátis */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="h-5 w-5 text-pink-600" />
                {remainingForFreeShipping > 0 ? (
                  <p className="text-sm text-gray-700">
                    Adicione{" "}
                    <span className="font-bold text-pink-600">
                      {formatCurrency(remainingForFreeShipping)}
                    </span>{" "}
                    para ganhar{" "}
                    <span className="font-bold text-green-600">FRETE GRÁTIS</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-green-600">
                    Parabéns! Você ganhou FRETE GRÁTIS!
                  </p>
                )}
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${shippingProgress}%`,
                    background:
                      shippingProgress >= 100
                        ? "linear-gradient(90deg, #10b981, #059669)"
                        : "linear-gradient(90deg, #f472b6, #ec4899)",
                  }}
                />
              </div>
            </div>

            {/* Itens do carrinho */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Seção de upsell: "Leve também" */}
            {upsellProducts.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-pink-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Leve também
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {upsellProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-pink-200 hover:bg-pink-50/30"
                    >
                      {/* Imagem */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-300 text-xs">
                            Sem foto
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${product.slug}`}
                          className="text-xs font-medium text-gray-800 line-clamp-2 hover:text-pink-600"
                        >
                          {product.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-bold text-pink-600">
                            {formatCurrency(product.price)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(product.compareAtPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botão adicionar */}
                      <button
                        onClick={() =>
                          addItem(
                            {
                              id: product.id,
                              title: product.title,
                              price: product.price,
                              image: product.images[0]?.url || "",
                              slug: product.slug,
                              stock: 99,
                              minQuantity: 1,
                              maxQuantity: 99,
                            },
                            1,
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition hover:bg-pink-600 hover:text-white"
                        title="Adicionar ao carrinho"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
