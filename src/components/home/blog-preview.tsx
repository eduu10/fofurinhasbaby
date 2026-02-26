"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Calendar, Clock, ArrowRight } from "lucide-react";
import { allArticles, categoryLabels, categoryColors, categoryEmojis } from "@/lib/blog";
import type { BlogArticle } from "@/lib/blog";

function getRandomArticles(count: number): BlogArticle[] {
  const shuffled = [...allArticles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function BlogPreview() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);

  useEffect(() => {
    setArticles(getRandomArticles(4));
  }, []);

  if (articles.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">
          Dicas para Mamaes
        </span>
        <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
          Nosso{" "}
          <span className="text-baby-pink underline decoration-wavy decoration-baby-yellow underline-offset-4">
            Blog
          </span>
        </h2>
        <p className="text-gray-500 mt-3 max-w-lg mx-auto">
          Artigos escritos com carinho para ajudar voce nessa jornada incrivel da maternidade
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {articles.map((article) => {
          const date = new Date(article.publishedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });

          return (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className="group bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-baby-blue/20 hover:border-baby-blue/50 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full"
            >
              {/* Cover */}
              <div className="relative h-44 bg-gradient-to-br from-pink-50 to-blue-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 group-hover:scale-110 transition-transform duration-500">
                  {categoryEmojis[article.category]}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${categoryColors[article.category]}`}>
                    {categoryEmojis[article.category]} {categoryLabels[article.category]}
                  </span>
                </div>
              </div>

              {/* Content */}
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
                <h3 className="font-display text-base font-bold text-gray-800 mb-2 group-hover:text-baby-pink transition-colors leading-tight line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 mb-4 flex-1">
                  {article.excerpt}
                </p>
                <span className="inline-flex items-center gap-1.5 text-baby-blue font-bold text-xs group-hover:gap-2.5 transition-all mt-auto">
                  Leia mais <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 bg-baby-pink text-white font-display font-bold text-sm py-3 px-8 rounded-xl shadow-lg hover:bg-pink-400 transition-colors"
        >
          <BookOpen size={18} />
          Ver Todos os Artigos
        </Link>
      </div>
    </section>
  );
}
