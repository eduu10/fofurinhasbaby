"use client";

import { useEffect, useState } from "react";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import { ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";

interface ProductGalleryProps {
  keywords: string[];
  title?: string;
}

export function ProductGallery({
  keywords,
  title = "Produtos Recomendados",
}: ProductGalleryProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`/api/products?limit=8&sort=sales`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        // API returns { success, data: { products, pagination } }
        const productList = json?.data?.products || json?.products || [];
        const mapped: ProductCardData[] = productList
          .slice(0, 4)
          .map(
            (p: {
              id: string;
              title: string;
              slug: string;
              price: number;
              compareAtPrice?: number | null;
              images?: { url: string }[];
              category?: { name: string } | null;
              stock: number;
              minQuantity: number;
              maxQuantity: number;
              salesCount?: number;
            }) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              price: Number(p.price),
              compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
              image: p.images?.[0]?.url || "/placeholder.jpg",
              secondImage: p.images?.[1]?.url || null,
              category: p.category?.name || null,
              stock: p.stock,
              minQuantity: p.minQuantity || 1,
              maxQuantity: p.maxQuantity || 99,
              salesCount: p.salesCount || 0,
              freeShipping: true,
            })
          );
        setProducts(mapped);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [keywords]);

  if (loading) {
    return (
      <div className="my-10 bg-gradient-to-br from-pink-50/50 to-blue-50/50 rounded-3xl p-8 border border-baby-pink/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-buy rounded-full flex items-center justify-center">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <h3 className="font-display text-xl font-bold text-gray-800">
            {title}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl h-72 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="my-10 bg-gradient-to-br from-pink-50/50 to-blue-50/50 rounded-3xl p-8 border border-baby-pink/10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="text-baby-pink" size={24} />
          <h3 className="font-display text-xl font-bold text-gray-800">
            Confira Nossa Loja
          </h3>
          <Sparkles className="text-baby-pink" size={24} />
        </div>
        <p className="text-gray-600 mb-4">
          Encontre tudo para seu bebe com frete gratis e parcelas sem juros!
        </p>
        <Link
          href="/products"
          className="inline-block bg-gradient-buy text-white font-display font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          Ver Todos os Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="my-10 bg-gradient-to-br from-pink-50/50 to-blue-50/50 rounded-3xl p-6 md:p-8 border border-baby-pink/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-buy rounded-full flex items-center justify-center shadow-md">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-gray-800">
              {title}
            </h3>
            <p className="text-xs text-gray-500">
              Frete gratis + 12x sem juros
            </p>
          </div>
        </div>
        <Link
          href="/products"
          className="text-sm font-bold text-baby-blue hover:underline hidden sm:block"
        >
          Ver todos →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div className="mt-4 text-center sm:hidden">
        <Link
          href="/products"
          className="inline-block bg-gradient-buy text-white font-display font-bold py-2.5 px-6 rounded-xl shadow-md text-sm"
        >
          Ver Todos os Produtos
        </Link>
      </div>
    </div>
  );
}
