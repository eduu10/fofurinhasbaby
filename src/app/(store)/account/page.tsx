"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import toast from "react-hot-toast";

export default function AccountPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: (user?.phone as string) || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.success) {
        updateUser(json.data);
        toast.success("Dados atualizados com sucesso!");
      } else {
        toast.error(json.error || "Erro ao atualizar dados");
      }
    } catch {
      toast.error("Erro ao atualizar dados");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-gray-800">
        Dados Pessoais
      </h2>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome completo
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Telefone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Alterações"}
        </button>
      </form>
    </div>
  );
}
