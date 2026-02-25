"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface FavoriteProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
}

const FAVORITES_KEY = "fofurinhas-favorites";

export default function FavoritesPage() {
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]") as string[];
        if (stored.length === 0) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/products/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: stored }),
        });
        const json = await res.json();
        if (json.success) {
          setProducts(json.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, []);

  function removeFavorite(productId: string) {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]") as string[];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(stored.filter((id) => id !== productId)));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-baby-pink border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-display font-bold text-gray-800">
        Meus Favoritos
      </h2>

      {products.length === 0 ? (
        <div className="py-12 text-center">
          <Heart size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Voce ainda nao tem favoritos.</p>
          <p className="text-sm text-gray-400 mt-1">Clique no coracao nos produtos para salvar seus favoritos.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-bold text-baby-pink hover:text-pink-400 transition-colors"
          >
            Explorar produtos &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-baby-pink/30 transition-all group relative"
            >
              <button
                onClick={() => removeFavorite(product.id)}
                className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-all"
                aria-label="Remover favorito"
              >
                <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
              </button>
              <Link href={`/products/${product.slug}`}>
                <div className="relative h-40 bg-gray-100">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-display font-bold text-sm text-gray-800 line-clamp-2 leading-tight group-hover:text-baby-pink transition-colors">
                    {product.title}
                  </h3>
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-display font-bold text-accent-orange">
                    {formatCurrency(product.price)}
                  </span>
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
                    disabled={product.stock <= 0}
                    className="bg-baby-pink text-white p-2 rounded-xl hover:bg-pink-400 transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
