import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { categoryLabels, categoryColors, categoryEmojis } from "@/lib/blog";
import type { BlogArticle } from "@/lib/blog";

interface BlogCardProps {
  article: BlogArticle;
  featured?: boolean;
}

export function BlogCard({ article, featured }: BlogCardProps) {
  const date = new Date(article.publishedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (featured) {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className="group block bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-baby-blue/20 hover:border-baby-blue/50 transition-all duration-300 hover:-translate-y-1 md:grid md:grid-cols-2"
      >
        <div className="relative h-64 md:h-full min-h-[300px] bg-gradient-to-br from-pink-100 to-blue-100 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-30">
            {categoryEmojis[article.category]}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute top-4 left-4">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${categoryColors[article.category]}`}
            >
              {categoryEmojis[article.category]}{" "}
              {categoryLabels[article.category]}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-block bg-baby-pink text-white text-xs font-bold px-3 py-1 rounded-full">
              DESTAQUE
            </span>
          </div>
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {article.readTime} min de leitura
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-800 mb-3 group-hover:text-baby-pink transition-colors leading-tight">
            {article.title}
          </h2>
          <p className="text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-2 text-baby-blue font-bold text-sm group-hover:gap-3 transition-all">
            Ler artigo completo <ArrowRight size={16} />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-baby-blue/20 hover:border-baby-blue/50 transition-all duration-300 hover:-translate-y-2 h-full flex flex-col"
    >
      <div className="relative h-48 bg-gradient-to-br from-pink-50 to-blue-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 group-hover:scale-110 transition-transform duration-500">
          {categoryEmojis[article.category]}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${categoryColors[article.category]}`}
          >
            {categoryEmojis[article.category]}{" "}
            {categoryLabels[article.category]}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2">
          <span className="inline-flex items-center gap-1">
            <Calendar size={10} />
            {date}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={10} />
            {article.readTime} min
          </span>
        </div>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-2 group-hover:text-baby-pink transition-colors leading-tight line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
          {article.excerpt}
        </p>
        <span className="inline-flex items-center gap-1.5 text-baby-blue font-bold text-xs group-hover:gap-2.5 transition-all mt-auto">
          Leia mais <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
