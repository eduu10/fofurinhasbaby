import { Metadata } from "next";
import {
  allArticles,
  getArticlesByCategory,
  searchArticles,
  paginateArticles,
  categoryLabels,
  categoryColors,
  categoryEmojis,
  getAllCategories,
} from "@/lib/blog";
import type { BlogCategory } from "@/lib/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogSidebar } from "@/components/blog/blog-sidebar";
import { ProductGallery } from "@/components/blog/product-gallery";
import { NewsletterCTA } from "@/components/blog/newsletter-cta";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog Fofurinhas Baby | Dicas para Mamaes e Bebes",
  description:
    "Artigos completos com dicas de maternidade, cuidados com recem-nascido, amamentacao, sono do bebe, alimentacao infantil, moda baby e muito mais. Guias praticos para mamaes e papais.",
  keywords: [
    "blog maternidade",
    "dicas para mamaes",
    "cuidados com bebe",
    "recem-nascido",
    "amamentacao",
    "sono do bebe",
    "alimentacao infantil",
    "enxoval de bebe",
    "moda infantil",
    "produtos para bebe",
  ],
  openGraph: {
    title: "Blog Fofurinhas Baby | Dicas para Mamaes e Bebes",
    description:
      "Dicas de especialistas sobre maternidade, cuidados com o bebe, alimentacao, sono e muito mais.",
    type: "website",
    locale: "pt_BR",
    siteName: "Fofurinhas Baby",
  },
};

interface PageProps {
  searchParams: Promise<{
    pagina?: string;
    categoria?: string;
    tag?: string;
    busca?: string;
  }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.pagina || "1", 10);
  const category = (params.categoria as BlogCategory) || null;
  const tag = params.tag || null;
  const search = params.busca || null;

  let filtered = allArticles;
  let pageTitle = "Blog";
  let pageSubtitle =
    "Dicas, guias e artigos sobre maternidade e cuidados com o bebe";

  if (search) {
    filtered = searchArticles(search);
    pageTitle = `Resultados para "${search}"`;
    pageSubtitle = `${filtered.length} artigo${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`;
  } else if (category && categoryLabels[category]) {
    filtered = getArticlesByCategory(category);
    pageTitle = `${categoryEmojis[category]} ${categoryLabels[category]}`;
    pageSubtitle = `${filtered.length} artigo${filtered.length !== 1 ? "s" : ""} na categoria ${categoryLabels[category]}`;
  } else if (tag) {
    filtered = allArticles.filter((a) =>
      a.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
    pageTitle = `#${tag}`;
    pageSubtitle = `${filtered.length} artigo${filtered.length !== 1 ? "s" : ""} com a tag "${tag}"`;
  }

  const { articles, totalPages, currentPage } = paginateArticles(
    filtered,
    page
  );
  const featuredArticle = currentPage === 1 && !search && !category && !tag ? allArticles[0] : null;
  const gridArticles = featuredArticle
    ? articles.filter((a) => a.id !== featuredArticle.id)
    : articles;
  const categories = getAllCategories();

  const buildUrl = (p: number) => {
    const base = "/blog";
    const qp = new URLSearchParams();
    if (p > 1) qp.set("pagina", String(p));
    if (category) qp.set("categoria", category);
    if (tag) qp.set("tag", tag);
    if (search) qp.set("busca", search);
    const qs = qp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Fofurinhas Baby",
    description:
      "Artigos e dicas sobre maternidade, cuidados com bebes e produtos infantis",
    url: "https://fofurinhasbaby.vercel.app/blog",
    publisher: {
      "@type": "Organization",
      name: "Fofurinhas Baby",
      url: "https://fofurinhasbaby.vercel.app",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-baby-pink/10 via-white to-baby-blue/10 py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="text-baby-pink" size={32} />
            <h1 className="font-display text-3xl md:text-5xl font-bold text-gradient-pink">
              {pageTitle}
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            {pageSubtitle}
          </p>

          {/* Category Pills */}
          {!search && (
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              <Link
                href="/blog"
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  !category
                    ? "bg-baby-pink text-white shadow-pink-glow"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Todos
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/blog?categoria=${cat}`}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    category === cat
                      ? "bg-baby-pink text-white shadow-pink-glow"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {categoryEmojis[cat]} {categoryLabels[cat]}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Featured Article */}
            {featuredArticle && (
              <div className="mb-10">
                <BlogCard article={featuredArticle} featured />
              </div>
            )}

            {/* Articles Grid */}
            {gridArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {gridArticles.map((article) => (
                  <BlogCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-6xl mb-4">🔍</p>
                <h3 className="font-display text-xl font-bold text-gray-700 mb-2">
                  Nenhum artigo encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  Tente buscar por outro termo ou explore nossas categorias.
                </p>
                <Link
                  href="/blog"
                  className="inline-block bg-baby-pink text-white font-bold py-2 px-6 rounded-xl"
                >
                  Ver todos os artigos
                </Link>
              </div>
            )}

            {/* Product Gallery */}
            {currentPage === 1 && (
              <ProductGallery
                keywords={["bebe", "roupa", "brinquedo"]}
                title="Aproveite Nossas Ofertas"
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-10">
                {currentPage > 1 && (
                  <Link
                    href={buildUrl(currentPage - 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 2
                  )
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Link
                          href={buildUrl(p)}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                            p === currentPage
                              ? "bg-baby-pink text-white shadow-pink-glow"
                              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </Link>
                      </span>
                    );
                  })}
                {currentPage < totalPages && (
                  <Link
                    href={buildUrl(currentPage + 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Proximo <ChevronRight size={16} />
                  </Link>
                )}
              </nav>
            )}

            {/* Newsletter */}
            <div className="mt-12">
              <NewsletterCTA />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <BlogSidebar currentCategory={category} currentTag={tag} />
          </div>
        </div>
      </section>
    </>
  );
}
