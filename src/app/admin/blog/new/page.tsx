"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "gravidez", label: "Gravidez" },
  { value: "recem-nascido", label: "Recem-Nascido" },
  { value: "amamentacao", label: "Amamentacao" },
  { value: "sono-do-bebe", label: "Sono do Bebe" },
  { value: "alimentacao", label: "Alimentacao" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "saude", label: "Saude" },
  { value: "moda-infantil", label: "Moda Infantil" },
  { value: "decoracao", label: "Decoracao" },
  { value: "dicas-de-mae", label: "Dicas de Mae" },
  { value: "passeios", label: "Passeios" },
  { value: "seguranca", label: "Seguranca" },
  { value: "sustentabilidade", label: "Sustentabilidade" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "educacao", label: "Educacao" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewBlogPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    category: "",
    tags: "",
    author: "Equipe Fofurinhas Baby",
    readingTime: "7",
    content: "",
    metaTitle: "",
    metaDescription: "",
    published: false,
    publishedAt: "",
    relatedProducts: "",
    coverImage: "",
  });

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugify(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        category: form.category,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        author: form.author,
        readingTime: parseInt(form.readingTime) || 7,
        content: form.content,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        published: form.published,
        publishedAt: form.publishedAt || null,
        relatedProducts: form.relatedProducts
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        coverImage: form.coverImage || null,
      };

      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Artigo criado com sucesso!");
        router.push("/admin/blog");
      } else {
        toast.error(json.error || "Erro ao criar artigo");
      }
    } catch {
      toast.error("Erro ao criar artigo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/blog"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Novo Artigo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Informacoes Basicas */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Informacoes Basicas
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Titulo *
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Titulo do artigo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="url-do-artigo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Resumo / Excerpt *
              </label>
              <textarea
                required
                rows={3}
                maxLength={200}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Breve descricao do artigo (max 200 caracteres)"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {form.excerpt.length}/200
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Categoria *
                </label>
                <select
                  required
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none"
                >
                  <option value="">Selecione uma categoria</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tags (separadas por virgula)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="bebe, maternidade, dicas"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Autor
                </label>
                <input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tempo de Leitura (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.readingTime}
                  onChange={(e) =>
                    setForm({ ...form, readingTime: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Conteudo */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Conteudo
          </h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Conteudo *
            </label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="min-h-[400px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              placeholder="<h2>Introducao</h2>&#10;<p>Conteudo do artigo...</p>"
            />
            <p className="mt-2 text-xs text-gray-400">
              Use tags HTML: h2, h3, p, ul, li, strong, a
            </p>
          </div>
        </div>

        {/* Section 3: SEO */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meta Titulo
              </label>
              <input
                maxLength={60}
                value={form.metaTitle}
                onChange={(e) =>
                  setForm({ ...form, metaTitle: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Titulo para mecanismos de busca (max 60 chars)"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {form.metaTitle.length}/60
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meta Descricao
              </label>
              <textarea
                rows={2}
                maxLength={160}
                value={form.metaDescription}
                onChange={(e) =>
                  setForm({ ...form, metaDescription: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Descricao para mecanismos de busca (max 160 chars)"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {form.metaDescription.length}/160
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Configuracoes */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Configuracoes
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) =>
                  setForm({ ...form, published: e.target.checked })
                }
                className="accent-pink-600 h-4 w-4"
              />
              <label
                htmlFor="published"
                className="text-sm font-medium text-gray-700"
              >
                Publicado
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Data de Publicacao
                </label>
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) =>
                    setForm({ ...form, publishedAt: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Produtos Relacionados (separados por virgula)
                </label>
                <input
                  value={form.relatedProducts}
                  onChange={(e) =>
                    setForm({ ...form, relatedProducts: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="berco, carrinho, cadeira"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Imagem de Capa (URL)
              </label>
              <input
                type="url"
                value={form.coverImage}
                onChange={(e) =>
                  setForm({ ...form, coverImage: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
          <Link
            href="/admin/blog"
            className="rounded-xl border border-gray-300 px-8 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
