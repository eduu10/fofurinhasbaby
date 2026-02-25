import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductFilters } from "@/components/product/product-filters";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Produtos | Fofurinhas Baby",
  description: "Encontre os melhores produtos para seu bebe com os melhores precos. Roupas, acessorios, brinquedos e muito mais.",
};

interface Props {
  searchParams: Promise<{
    category?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
    featured?: string;
    offers?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    isDraft: false,
  };

  if (params.category) {
    where.category = { slug: params.category };
  }

  if (params.search) {
    where.OR = [
      { title: { contains: params.search } },
      { description: { contains: params.search } },
    ];
  }

  if (params.featured === "true") {
    where.isFeatured = true;
  }

  if (params.offers === "true") {
    where.compareAtPrice = { not: null };
  }

  if (params.minPrice || params.maxPrice) {
    where.price = {};
    if (params.minPrice) where.price.gte = parseFloat(params.minPrice);
    if (params.maxPrice) where.price.lte = parseFloat(params.maxPrice);
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  switch (params.sort) {
    case "price_asc":
      orderBy = { price: "asc" };
      break;
    case "price_desc":
      orderBy = { price: "desc" };
      break;
    case "sales":
    case "bestsellers":
      orderBy = { salesCount: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
  }

  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  let total = 0;
  let categories: Awaited<ReturnType<typeof prisma.category.findMany>> = [];
  let categoryName = "";

  try {
    [products, total, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (params.category) {
      const cat = categories.find((c) => c.slug === params.category);
      if (cat) categoryName = cat.name;
    }
  } catch {
    // Database not available
  }

  const totalPages = Math.ceil(total / limit);

  // Build breadcrumb
  const breadcrumbItems: { label: string; href?: string }[] = [{ label: "Produtos", href: "/products" }];
  if (categoryName) {
    breadcrumbItems.push({ label: categoryName });
  } else if (params.search) {
    breadcrumbItems.push({ label: `Busca: "${params.search}"` });
  } else if (params.featured === "true") {
    breadcrumbItems.push({ label: "Destaques" });
  } else if (params.offers === "true") {
    breadcrumbItems.push({ label: "Ofertas" });
  }

  // Page title
  let pageTitle = "Produtos";
  if (categoryName) pageTitle = categoryName;
  else if (params.search) pageTitle = `Resultados para "${params.search}"`;
  else if (params.featured === "true") pageTitle = "Produtos em Destaque";
  else if (params.offers === "true") pageTitle = "Ofertas Imperdiveis";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-800">{pageTitle}</h1>
        <p className="mt-2 text-gray-500">
          {total} {total === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </div>

      {/* Active filter chips */}
      {(params.category || params.minPrice || params.maxPrice || params.sort) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {params.category && categoryName && (
            <span className="inline-flex items-center gap-1 bg-baby-blue/10 text-baby-blue text-xs font-bold px-3 py-1.5 rounded-full">
              {categoryName}
              <Link href={`/products?${new URLSearchParams({ ...params, category: "" }).toString()}`} className="hover:text-red-500 ml-1">&times;</Link>
            </span>
          )}
          {params.minPrice && (
            <span className="inline-flex items-center gap-1 bg-baby-pink/10 text-baby-pink text-xs font-bold px-3 py-1.5 rounded-full">
              Min: R${params.minPrice}
            </span>
          )}
          {params.maxPrice && (
            <span className="inline-flex items-center gap-1 bg-baby-pink/10 text-baby-pink text-xs font-bold px-3 py-1.5 rounded-full">
              Max: R${params.maxPrice}
            </span>
          )}
          {params.sort && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">
              {params.sort === "price_asc" ? "Menor Preco" : params.sort === "price_desc" ? "Maior Preco" : params.sort === "sales" ? "Mais Vendidos" : "Mais Recentes"}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <ProductFilters categories={categories.map(c => ({ value: c.slug, label: c.name }))} />
        </aside>

        {/* Products */}
        <div className="flex-1">
          <Suspense fallback={<ProductGridSkeleton count={limit} />}>
            {products.length > 0 ? (
              <>
                <ProductGrid products={products} />
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-6xl">&#128269;</div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Nenhum produto encontrado
                </h3>
                <p className="mt-2 text-gray-500">
                  Tente ajustar os filtros ou faca uma nova busca.
                </p>
                <Link
                  href="/products"
                  className="mt-4 text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors"
                >
                  Ver todos os produtos &rarr;
                </Link>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
