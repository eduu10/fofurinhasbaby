import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { formatCurrency } from "@/lib/utils";

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { isActive: true, isDraft: false, isFeatured: true },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    take: 8,
  });
}

async function getBestsellers() {
  return prisma.product.findMany({
    where: { isActive: true, isDraft: false },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    orderBy: { salesCount: "desc" },
    take: 8,
  });
}

async function getOffers() {
  return prisma.product.findMany({
    where: {
      isActive: true,
      isDraft: false,
      compareAtPrice: { not: null },
    },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    take: 8,
  });
}

async function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });
}

export default async function HomePage() {
  const [featured, bestsellers, offers, categories] = await Promise.all([
    getFeaturedProducts(),
    getBestsellers(),
    getOffers(),
    getCategories(),
  ]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-pink-600 to-pink-400 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Os melhores produtos para seu bebê
            </h1>
            <p className="mt-4 text-lg text-pink-100 sm:text-xl">
              Encontre roupas, acessórios e brinquedos com os melhores preços e
              entrega rápida para todo o Brasil.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="rounded-full bg-white px-8 py-3 text-base font-semibold text-pink-600 shadow-lg transition hover:bg-pink-50"
              >
                Ver Produtos
              </Link>
              <Link
                href="/products?sort=sales"
                className="rounded-full border-2 border-white px-8 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Mais Vendidos
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" className="w-full">
            <path
              d="M0 48h1440V0C1200 32 960 48 720 48S240 32 0 0v48z"
              fill="#fafafa"
            />
          </svg>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-gray-800">Categorias</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-2xl transition group-hover:bg-pink-200">
                  🧸
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              Produtos em Destaque
            </h2>
            <Link
              href="/products?featured=true"
              className="text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              Ver todos →
            </Link>
          </div>
          <ProductGrid products={featured as never[]} />
        </section>
      )}

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                Mais Vendidos
              </h2>
              <Link
                href="/products?sort=sales"
                className="text-sm font-medium text-pink-600 hover:text-pink-700"
              >
                Ver todos →
              </Link>
            </div>
            <ProductGrid products={bestsellers as never[]} />
          </div>
        </section>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Ofertas</h2>
            <Link
              href="/products?offers=true"
              className="text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              Ver todas →
            </Link>
          </div>
          <ProductGrid products={offers as never[]} />
        </section>
      )}

      {/* Trust Badges */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-xl">
                🚚
              </div>
              <h3 className="font-semibold text-gray-800">Frete Grátis</h3>
              <p className="mt-1 text-sm text-gray-500">
                Acima de R$ 199,00
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-xl">
                🔒
              </div>
              <h3 className="font-semibold text-gray-800">Compra Segura</h3>
              <p className="mt-1 text-sm text-gray-500">
                Pagamento protegido
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-xl">
                ↩️
              </div>
              <h3 className="font-semibold text-gray-800">Troca Fácil</h3>
              <p className="mt-1 text-sm text-gray-500">Até 30 dias</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-xl">
                💬
              </div>
              <h3 className="font-semibold text-gray-800">Suporte</h3>
              <p className="mt-1 text-sm text-gray-500">
                Atendimento humanizado
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
