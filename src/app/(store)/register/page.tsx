"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setAuth(json.data.user, json.data.token);
        toast.success("Conta criada com sucesso!");
        router.push("/");
      } else {
        toast.error(json.error || "Erro ao criar conta");
      }
    } catch {
      toast.error("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800">Criar Conta</h1>
            <p className="mt-2 text-sm text-gray-500">
              Cadastre-se para começar a comprar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Seu nome"
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
                placeholder="seu@email.com"
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
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirmar senha
              </label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Repita a senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-pink-600 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
            >
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="font-medium text-pink-600 hover:text-pink-700"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
