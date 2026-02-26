import { prisma } from "@/lib/prisma";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import Link from "next/link";

interface ProductGalleryProps {
  keywords?: string[];
  title?: string;
  subtitle?: string;
}

export async function ProductGallery({
  title = "Ofertas Imperdiveis",
  subtitle = "Aproveite!",
}: ProductGalleryProps) {
  let products: ProductCardData[] = [];

  try {
    const raw = await prisma.product.findMany({
      where: { isActive: true, isDraft: false },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      orderBy: { salesCount: "desc" },
      take: 4,
    });

    products = raw.map((p) => ({
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
    }));
  } catch {
    products = [];
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

  const titleWords = title.split(" ");
  const lastWord = titleWords.pop();
  const firstWords = titleWords.join(" ");

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="text-accent-orange font-bold tracking-wider uppercase text-sm">{subtitle}</span>
        <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
          {firstWords}{" "}
          <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">
            {lastWord}
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
