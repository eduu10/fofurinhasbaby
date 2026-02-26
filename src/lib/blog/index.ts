import { articles1 } from "./articles-1";
import { articles2 } from "./articles-2";
import { articles3 } from "./articles-3";
import { articles4 } from "./articles-4";
import type { BlogArticle, BlogCategory } from "./types";
export { categoryLabels, categoryColors, categoryEmojis } from "./types";
export type { BlogArticle, BlogCategory } from "./types";

export const allArticles: BlogArticle[] = [
  ...articles1,
  ...articles2,
  ...articles3,
  ...articles4,
].sort(
  (a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return allArticles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: BlogCategory): BlogArticle[] {
  return allArticles.filter((a) => a.category === category);
}

export function getRelatedArticles(
  article: BlogArticle,
  limit = 3
): BlogArticle[] {
  const sameCat = allArticles.filter(
    (a) => a.category === article.category && a.id !== article.id
  );
  const sameTag = allArticles.filter(
    (a) =>
      a.id !== article.id &&
      a.category !== article.category &&
      a.tags.some((t) => article.tags.includes(t))
  );
  return [...sameCat, ...sameTag].slice(0, limit);
}

export function searchArticles(query: string): BlogArticle[] {
  const q = query.toLowerCase();
  return allArticles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function getAllCategories(): BlogCategory[] {
  const cats = new Set(allArticles.map((a) => a.category));
  return Array.from(cats) as BlogCategory[];
}

export function getAllTags(): string[] {
  const tags = new Set(allArticles.flatMap((a) => a.tags));
  return Array.from(tags).sort();
}

export function paginateArticles(
  articles: BlogArticle[],
  page: number,
  perPage = 12
): { articles: BlogArticle[]; totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(articles.length / perPage);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * perPage;
  return {
    articles: articles.slice(start, start + perPage),
    totalPages,
    currentPage,
  };
}
