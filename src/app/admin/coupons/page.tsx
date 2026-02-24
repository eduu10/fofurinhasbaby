"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: string;
  minPurchase: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE" as "FIXED" | "PERCENTAGE",
    value: "",
    minPurchase: "",
    maxUses: "",
    expiresAt: "",
    isActive: true,
  });

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/admin/coupons");
      const json = await res.json();
      if (json.success) {
          const list = Array.isArray(json.data) ? json.data : json.data?.coupons || [];
          setCoupons(list);
        }
    } finally { setLoading(false); }
  }

  async function handleSave() {
    const url = editing ? `/api/admin/coupons/${editing}` : "/api/admin/coupons";
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
          minPurchase: form.minPurchase ? parseFloat(form.minPurchase) : null,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Cupom atualizado!" : "Cupom criado!");
        fetchCoupons();
        resetForm();
      } else { toast.error(json.error); }
    } catch { toast.error("Erro ao salvar cupom"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir este cupom?")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Cupom excluído!"); setCoupons(coupons.filter(c => c.id !== id)); }
    } catch { toast.error("Erro ao excluir cupom"); }
  }

  function startEdit(c: Coupon) {
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minPurchase: c.minPurchase || "",
      maxUses: c.maxUses?.toString() || "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      isActive: c.isActive,
    });
    setEditing(c.id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({ code: "", type: "PERCENTAGE", value: "", minPurchase: "", maxUses: "", expiresAt: "", isActive: true });
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Cupons de Desconto</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-700">
          <Plus className="h-4 w-4" /> Novo Cupom
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">{editing ? "Editar Cupom" : "Novo Cupom"}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Código *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX: DESCONTO10" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm uppercase focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "FIXED" | "PERCENTAGE" })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none">
                <option value="PERCENTAGE">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Valor *</label>
              <input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Compra mínima (R$)</label>
              <input type="number" step="0.01" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Limite de uso</label>
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Validade</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-pink-600" /> Ativo</label>
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
        ) : coupons.length === 0 ? (
          <div className="py-12 text-center"><p className="text-gray-500">Nenhum cupom criado.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Código</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Valor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Uso</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Validade</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 font-mono font-medium text-gray-800">{c.code}</td>
                    <td className="px-6 py-4 text-gray-600">{c.type === "PERCENTAGE" ? "Percentual" : "Fixo"}</td>
                    <td className="px-6 py-4 text-gray-800">{c.type === "PERCENTAGE" ? `${c.value}%` : formatCurrency(c.value)}</td>
                    <td className="px-6 py-4 text-gray-600">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                    <td className="px-6 py-4 text-gray-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "Sem limite"}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.isActive ? "Ativo" : "Inativo"}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(c)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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
