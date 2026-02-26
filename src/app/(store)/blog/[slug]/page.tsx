import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getArticleBySlug,
  getRelatedArticles,
  allArticles,
  categoryLabels,
  categoryColors,
  categoryEmojis,
} from "@/lib/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogSidebar } from "@/components/blog/blog-sidebar";
import { ProductGallery } from "@/components/blog/product-gallery";
import { ShareButtons } from "@/components/blog/share-buttons";
import { NewsletterCTA } from "@/components/blog/newsletter-cta";
import {
  Calendar,
  Clock,
  User,
  ChevronRight,
  Home,
  ArrowLeft,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Artigo nao encontrado" };

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    keywords: article.tags,
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      type: "article",
      locale: "pt_BR",
      siteName: "Fofurinhas Baby",
      publishedTime: article.publishedAt,
      authors: [article.author],
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle,
      description: article.metaDescription,
    },
    alternates: {
      canonical: `https://fofurinhasbaby.vercel.app/blog/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(article, 3);
  const date = new Date(article.publishedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const articleIndex = allArticles.findIndex((a) => a.id === article.id);
  const prevArticle = articleIndex < allArticles.length - 1 ? allArticles[articleIndex + 1] : null;
  const nextArticle = articleIndex > 0 ? allArticles[articleIndex - 1] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedAt,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Fofurinhas Baby",
      url: "https://fofurinhasbaby.vercel.app",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://fofurinhasbaby.vercel.app/blog/${article.slug}`,
    },
    keywords: article.tags.join(", "),
    articleSection: categoryLabels[article.category],
    wordCount: article.content.replace(/<[^>]*>/g, "").split(/\s+/).length,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://fofurinhasbaby.vercel.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://fofurinhasbaby.vercel.app/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryLabels[article.category],
        item: `https://fofurinhasbaby.vercel.app/blog?categoria=${article.category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: article.title,
        item: `https://fofurinhasbaby.vercel.app/blog/${article.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-xs text-gray-500 overflow-x-auto whitespace-nowrap">
            <Link
              href="/"
              className="hover:text-baby-pink transition-colors flex items-center gap-1"
            >
              <Home size={12} />
              Home
            </Link>
            <ChevronRight size={12} />
            <Link href="/blog" className="hover:text-baby-pink transition-colors">
              Blog
            </Link>
            <ChevronRight size={12} />
            <Link
              href={`/blog?categoria=${article.category}`}
              className="hover:text-baby-pink transition-colors"
            >
              {categoryLabels[article.category]}
            </Link>
            <ChevronRight size={12} />
            <span className="text-gray-400 truncate max-w-[200px]">
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Article Header */}
      <section className="bg-gradient-to-br from-baby-pink/5 via-white to-baby-blue/5 py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Link
            href={`/blog?categoria=${article.category}`}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold mb-4 transition-transform hover:scale-105 ${categoryColors[article.category]}`}
          >
            {categoryEmojis[article.category]}{" "}
            {categoryLabels[article.category]}
          </Link>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
            {article.excerpt}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <User size={14} />
              {article.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {article.readTime} min de leitura
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Cover Image Area */}
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-pink-100 to-blue-100 rounded-3xl overflow-hidden mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[120px] opacity-30">
                  {categoryEmojis[article.category]}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute bottom-4 right-4">
                <ShareButtons
                  url={`/blog/${article.slug}`}
                  title={article.title}
                />
              </div>
            </div>

            {/* Article Content */}
            <article
              className="prose prose-lg max-w-none
                prose-headings:font-display prose-headings:text-gray-800
                prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-baby-pink/20 prose-h2:pb-3
                prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-baby-pink
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                prose-li:text-gray-700 prose-li:leading-relaxed
                prose-ul:my-4 prose-ul:space-y-2
                prose-ol:my-4 prose-ol:space-y-2
                prose-strong:text-gray-800
                prose-a:text-baby-blue prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-baby-pink prose-blockquote:bg-pink-50/50 prose-blockquote:rounded-r-xl prose-blockquote:py-1
              "
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Product Gallery */}
            <ProductGallery
              keywords={article.relatedProducts}
              title="Produtos que Voce Vai Adorar"
            />

            {/* Tags */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-gray-600">Tags:</span>
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-baby-pink/10 hover:text-baby-pink transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gray-50 rounded-2xl">
              <div>
                <p className="font-display font-bold text-gray-800">
                  Gostou do artigo?
                </p>
                <p className="text-sm text-gray-500">
                  Compartilhe com outras mamaes!
                </p>
              </div>
              <ShareButtons
                url={`/blog/${article.slug}`}
                title={article.title}
              />
            </div>

            {/* Prev / Next Navigation */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevArticle && (
                <Link
                  href={`/blog/${prevArticle.slug}`}
                  className="group flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-baby-blue/30 transition-all"
                >
                  <ArrowLeft
                    size={20}
                    className="text-gray-400 group-hover:text-baby-blue transition-colors flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      Artigo Anterior
                    </p>
                    <p className="text-sm font-semibold text-gray-700 group-hover:text-baby-blue transition-colors truncate">
                      {prevArticle.title}
                    </p>
                  </div>
                </Link>
              )}
              {nextArticle && (
                <Link
                  href={`/blog/${nextArticle.slug}`}
                  className="group flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-baby-pink/30 transition-all text-right sm:col-start-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      Proximo Artigo
                    </p>
                    <p className="text-sm font-semibold text-gray-700 group-hover:text-baby-pink transition-colors truncate">
                      {nextArticle.title}
                    </p>
                  </div>
                  <ArrowRight
                    size={20}
                    className="text-gray-400 group-hover:text-baby-pink transition-colors flex-shrink-0"
                  />
                </Link>
              )}
            </div>

            {/* Newsletter */}
            <div className="mt-10">
              <NewsletterCTA />
            </div>

            {/* Related Articles */}
            {related.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <BookOpen className="text-baby-pink" size={24} />
                  <h2 className="font-display text-2xl font-bold text-gray-800">
                    Artigos Relacionados
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {related.map((r) => (
                    <BlogCard key={r.id} article={r} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <BlogSidebar currentCategory={article.category} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
