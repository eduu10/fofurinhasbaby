"use client";

import { useEffect, useState } from "react";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import Link from "next/link";

interface ProductGalleryProps {
  keywords: string[];
  title?: string;
  subtitle?: string;
}

export function ProductGallery({
  keywords,
  title = "Ofertas Imperdiveis",
  subtitle = "Aproveite!",
}: ProductGalleryProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`/api/products?limit=8&sort=sales`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
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
              freeShipping: Number(p.price) >= 99,
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
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <span className="text-accent-orange font-bold tracking-wider uppercase text-sm">{subtitle}</span>
          <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
            {title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">
              {title.split(" ").slice(-1)[0]}
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border-2 border-baby-blue/10" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <span className="text-accent-orange font-bold tracking-wider uppercase text-sm">{subtitle}</span>
          <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
            Confira Nossa{" "}
            <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">Loja</span>
          </h2>
          <p className="text-gray-600 mt-3">
            Encontre tudo para seu bebe com frete gratis e parcelas sem juros!
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/products"
            className="inline-block bg-gradient-buy text-white font-display font-bold text-lg py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            Ver Todos os Produtos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="text-accent-orange font-bold tracking-wider uppercase text-sm">{subtitle}</span>
        <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
          {title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">
            {title.split(" ").slice(-1)[0]}
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div className="text-center mt-8">
        <Link href="/products" className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors">
          Ver todos os produtos &rarr;
        </Link>
      </div>
    </section>
  );
}
