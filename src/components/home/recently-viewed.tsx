"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RecentProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  viewedAt: number;
}

const STORAGE_KEY = "fofurinhas-recently-viewed";
const MAX_ITEMS = 4;

/** Save a product to recently viewed (call from product pages) */
export function saveRecentlyViewed(product: Omit<RecentProduct, "viewedAt">) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as RecentProduct[];
    const filtered = stored.filter((p) => p.id !== product.id);
    filtered.unshift({ ...product, viewedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 10)));
  } catch {
    // Ignore localStorage errors
  }
}

export function RecentlyViewed() {
  const [products, setProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as RecentProduct[];
      setProducts(stored.slice(0, MAX_ITEMS));
    } catch {
      // Ignore
    }
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <Eye size={20} className="text-baby-blue" />
        <h2 className="font-display text-2xl font-bold text-gray-800">
          Vistos Recentemente
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group bg-white rounded-2xl overflow-hidden shadow-md border-2 border-gray-100 hover:border-baby-blue/40 hover:-translate-y-1 transition-all"
          >
            <div className="relative h-40 overflow-hidden bg-gray-100">
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized
              />
              <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1 rounded-full">
                <Clock size={14} className="text-gray-500" />
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-display font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-baby-pink transition-colors">
                {product.title}
              </h3>
              <p className="text-accent-orange font-display font-bold mt-1">
                {formatCurrency(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
