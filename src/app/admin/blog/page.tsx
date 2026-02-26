"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { categoryLabels, categoryColors } from "@/lib/blog";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  publishedAt: string;
  author: string;
  readTime: number;
  source: "static" | "database";
}

const TABS = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunhos" },
  { value: "static", label: "Estaticos" },
  { value: "database", label: "Do Banco" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const PAGE_SIZE = 15;

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TabValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, page]);

  async function fetchPosts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter === "published" || filter === "draft") {
      params.set("status", filter);
    } else if (filter === "static" || filter === "database") {
      params.set("source", filter);
    }
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/admin/blog?${params}`);
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.posts || [];
        setPosts(list);
        const pag = json.data?.pagination;
        setTotal(pag?.total ?? list.length);
        setTotalPages(pag?.totalPages ?? Math.max(1, Math.ceil((pag?.total ?? list.length) / PAGE_SIZE)));
      }
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Deseja excluir este artigo permanentemente?")) return;
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPosts(posts.filter((p) => p.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        toast.success("Artigo excluido!");
      } else {
        toast.error(json.error || "Erro ao excluir artigo");
      }
    } catch {
      toast.error("Erro ao excluir artigo");
    }
  }

  function getCategoryColor(category: string): string {
    return categoryColors[category as keyof typeof categoryColors] ?? "bg-gray-100 text-gray-700";
  }

  function getCategoryLabel(category: string): string {
    return categoryLabels[category as keyof typeof categoryLabels] ?? category;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Blog</h1>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-700"
        >
          <Plus className="h-4 w-4" />
          Novo Artigo
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar artigos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-pink-600 text-white"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Nenhum artigo encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Titulo</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Categoria</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Origem</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Data de Publicacao</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    {/* Titulo */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 line-clamp-1">{post.title}</p>
                      {post.excerpt && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400">
                          {post.excerpt}
                        </p>
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getCategoryColor(post.category)}`}
                      >
                        {getCategoryLabel(post.category)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {post.isPublished ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          Publicado
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          Rascunho
                        </span>
                      )}
                    </td>

                    {/* Origem */}
                    <td className="px-6 py-4">
                      {post.source === "static" ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Estatico
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Banco
                        </span>
                      )}
                    </td>

                    {/* Data de Publicacao */}
                    <td className="px-6 py-4 text-gray-500">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>

                    {/* Acoes */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {post.source === "static" ? (
                          <>
                            <span
                              className="rounded-lg p-2 text-gray-300"
                              title="Artigo estatico — somente leitura"
                            >
                              <Lock className="h-4 w-4" />
                            </span>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`/admin/blog/${post.id}`}
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title="Editar artigo"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => deletePost(post.id)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              title="Excluir artigo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-500">
            {total} artigo{total !== 1 ? "s" : ""} no total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? "bg-pink-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
