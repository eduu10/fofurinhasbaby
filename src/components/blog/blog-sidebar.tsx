"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  categoryLabels,
  categoryColors,
  categoryEmojis,
  allArticles,
  getAllCategories,
  getAllTags,
} from "@/lib/blog";
import type { BlogCategory } from "@/lib/blog";

interface BlogSidebarProps {
  currentCategory?: BlogCategory | null;
  currentTag?: string | null;
}

export function BlogSidebar({ currentCategory, currentTag }: BlogSidebarProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const categories = getAllCategories();
  const popularTags = getAllTags().slice(0, 20);

  const categoryCounts: Record<string, number> = {};
  allArticles.forEach((a) => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/blog?busca=${encodeURIComponent(search.trim())}`);
    }
  };

  const recentArticles = allArticles.slice(0, 5);

  return (
    <aside className="space-y-8">
      {/* Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-baby-blue/10">
        <h3 className="font-display text-lg font-bold text-gray-800 mb-3">
          Buscar no Blog
        </h3>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artigos..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border-2 border-baby-blue/20 focus:border-baby-blue focus:outline-none bg-gray-50 text-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-baby-blue p-1 cursor-pointer"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-baby-blue/10">
        <h3 className="font-display text-lg font-bold text-gray-800 mb-3">
          Categorias
        </h3>
        <div className="space-y-1.5">
          <Link
            href="/blog"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              !currentCategory
                ? "bg-baby-pink/10 text-baby-pink"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>Todas</span>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
              {allArticles.length}
            </span>
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog?categoria=${cat}`}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentCategory === cat
                  ? "bg-baby-pink/10 text-baby-pink"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>
                {categoryEmojis[cat]} {categoryLabels[cat]}
              </span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {categoryCounts[cat] || 0}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-baby-blue/10">
        <h3 className="font-display text-lg font-bold text-gray-800 mb-3">
          Artigos Recentes
        </h3>
        <div className="space-y-3">
          {recentArticles.map((a) => (
            <Link
              key={a.id}
              href={`/blog/${a.slug}`}
              className="block group"
            >
              <h4 className="text-sm font-semibold text-gray-700 group-hover:text-baby-pink transition-colors line-clamp-2 leading-snug">
                {a.title}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {new Date(a.publishedAt).toLocaleDateString("pt-BR")}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-baby-blue/10">
        <h3 className="font-display text-lg font-bold text-gray-800 mb-3">
          Tags Populares
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Link
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                currentTag === tag
                  ? "bg-baby-pink text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-baby-pink/10 hover:text-baby-pink"
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-baby-pink/10 to-baby-blue/10 rounded-2xl p-6 text-center border border-baby-pink/20">
        <p className="text-3xl mb-2">🧸</p>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-2">
          Visite Nossa Loja
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Encontre os melhores produtos para seu bebe com precos incriveis!
        </p>
        <Link
          href="/products"
          className="inline-block bg-gradient-buy text-white font-display font-bold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
        >
          Ver Produtos
        </Link>
      </div>
    </aside>
  );
}
