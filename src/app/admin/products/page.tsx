"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Import } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  title: string;
  slug: string;
  price: string;
  stock: number;
  isActive: boolean;
  isDraft: boolean;
  salesCount: number;
  images: { url: string }[];
  category: { name: string } | null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchProducts();
  }, [search, filter]);

  async function fetchProducts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("status", filter);

    try {
      const res = await fetch(`/api/admin/products?${params}`);
      const json = await res.json();
      if (json.success) setProducts(json.data.products || []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleProduct(id: string) {
    try {
      const res = await fetch(`/api/admin/products/${id}/toggle`, {
        method: "PUT",
      });
      const json = await res.json();
      if (json.success) {
        setProducts(
          products.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
          )
        );
        toast.success("Produto atualizado!");
      }
    } catch {
      toast.error("Erro ao atualizar produto");
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Deseja excluir este produto?")) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setProducts(products.filter((p) => p.id !== id));
        toast.success("Produto excluído!");
      }
    } catch {
      toast.error("Erro ao excluir produto");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/products/import"
            className="flex items-center gap-2 rounded-xl border border-pink-600 px-4 py-2.5 text-sm font-medium text-pink-600 hover:bg-pink-50"
          >
            <Import className="h-4 w-4" />
            Importar AliExpress
          </Link>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-700"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="draft">Rascunhos</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Produto
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Categoria
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Preço
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Estoque
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Vendas
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {product.images[0] && (
                            <img
                              src={product.images[0].url}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {product.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {product.category?.name || "—"}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {product.salesCount}
                    </td>
                    <td className="px-6 py-4">
                      {product.isDraft ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          Rascunho
                        </span>
                      ) : product.isActive ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          Ativo
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => toggleProduct(product.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title={
                            product.isActive ? "Desativar" : "Ativar"
                          }
                        >
                          {product.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
