"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  _count?: { products: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isActive: true });

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } finally { setLoading(false); }
  }

  async function handleSave() {
    const url = editing ? `/api/admin/categories/${editing}` : "/api/admin/categories";
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Categoria atualizada!" : "Categoria criada!");
        fetchCategories();
        resetForm();
      } else { toast.error(json.error); }
    } catch { toast.error("Erro ao salvar categoria"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta categoria?")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Categoria excluída!"); setCategories(categories.filter(c => c.id !== id)); }
      else { toast.error(json.error); }
    } catch { toast.error("Erro ao excluir categoria"); }
  }

  function startEdit(cat: Category) {
    setForm({ name: cat.name, description: cat.description || "", isActive: cat.isActive });
    setEditing(cat.id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({ name: "", description: "", isActive: true });
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-700">
          <Plus className="h-4 w-4" /> Nova Categoria
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">{editing ? "Editar Categoria" : "Nova Categoria"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-pink-600" /> Ativa</label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSave} className="rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-pink-700">Salvar</button>
            <button onClick={resetForm} className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" /></div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center"><p className="text-gray-500">Nenhuma categoria criada.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Nome</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Slug</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Produtos</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 font-medium text-gray-800">{cat.name}</td>
                    <td className="px-6 py-4 text-gray-500">{cat.slug}</td>
                    <td className="px-6 py-4 text-gray-600">{cat._count?.products || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cat.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{cat.isActive ? "Ativa" : "Inativa"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(cat)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(cat.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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
