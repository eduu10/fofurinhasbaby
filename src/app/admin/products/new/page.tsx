"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface Variation {
  name: string;
  value: string;
  price: string;
  stock: string;
  sku: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDescription: "",
    sku: "",
    price: "",
    compareAtPrice: "",
    costPrice: "",
    stock: "0",
    minQuantity: "1",
    maxQuantity: "99",
    showStock: true,
    isActive: true,
    isDraft: false,
    isFeatured: false,
    categoryId: "",
    weight: "",
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  function addVariation() {
    setVariations([
      ...variations,
      { name: "", value: "", price: "", stock: "0", sku: "" },
    ]);
  }

  function removeVariation(index: number) {
    setVariations(variations.filter((_, i) => i !== index));
  }

  function updateVariation(index: number, field: string, value: string) {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
  }

  function addImageUrl() {
    setImageUrls([...imageUrls, ""]);
  }

  function removeImageUrl(index: number) {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        ...form,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice
          ? parseFloat(form.compareAtPrice)
          : null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        stock: parseInt(form.stock),
        minQuantity: parseInt(form.minQuantity),
        maxQuantity: parseInt(form.maxQuantity),
        weight: form.weight ? parseFloat(form.weight) : null,
        images: imageUrls
          .filter((url) => url.trim())
          .map((url, i) => ({ url, sortOrder: i })),
        variations: variations
          .filter((v) => v.name && v.value)
          .map((v) => ({
            name: v.name,
            value: v.value,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            sku: v.sku || null,
          })),
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Produto criado com sucesso!");
        router.push("/admin/products");
      } else {
        toast.error(json.error || "Erro ao criar produto");
      }
    } catch {
      toast.error("Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Novo Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Informações Básicas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título *
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div className="col-span-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição curta
              </label>
              <input
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({ ...form, shortDescription: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div className="col-span-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição completa
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none"
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                SKU
              </label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Preço e Estoque
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preço de venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preço promocional (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.compareAtPrice}
                onChange={(e) =>
                  setForm({ ...form, compareAtPrice: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preço de custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estoque
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Qtd mínima
              </label>
              <input
                type="number"
                value={form.minQuantity}
                onChange={(e) =>
                  setForm({ ...form, minQuantity: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Qtd máxima
              </label>
              <input
                type="number"
                value={form.maxQuantity}
                onChange={(e) =>
                  setForm({ ...form, maxQuantity: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.showStock}
                onChange={(e) =>
                  setForm({ ...form, showStock: e.target.checked })
                }
                className="accent-pink-600"
              />
              Exibir estoque
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) =>
                  setForm({ ...form, isFeatured: e.target.checked })
                }
                className="accent-pink-600"
              />
              Produto em destaque
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDraft}
                onChange={(e) =>
                  setForm({ ...form, isDraft: e.target.checked })
                }
                className="accent-pink-600"
              />
              Salvar como rascunho
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Imagens</h2>
          <div className="space-y-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  placeholder={
                    index === 0 ? "URL da imagem principal" : "URL da imagem"
                  }
                  value={url}
                  onChange={(e) => {
                    const updated = [...imageUrls];
                    updated[index] = e.target.value;
                    setImageUrls(updated);
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageUrl(index)}
                    className="rounded-xl p-3 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addImageUrl}
              className="flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar imagem
            </button>
          </div>
        </div>

        {/* Variations */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Variações
          </h2>
          {variations.length > 0 && (
            <div className="mb-4 space-y-3">
              {variations.map((v, index) => (
                <div key={index} className="flex flex-wrap gap-2 rounded-xl border border-gray-200 p-3">
                  <input
                    placeholder="Nome (ex: Cor)"
                    value={v.name}
                    onChange={(e) =>
                      updateVariation(index, "name", e.target.value)
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[120px]"
                  />
                  <input
                    placeholder="Valor (ex: Azul)"
                    value={v.value}
                    onChange={(e) =>
                      updateVariation(index, "value", e.target.value)
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[120px]"
                  />
                  <input
                    placeholder="Preço"
                    type="number"
                    step="0.01"
                    value={v.price}
                    onChange={(e) =>
                      updateVariation(index, "price", e.target.value)
                    }
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Estoque"
                    type="number"
                    value={v.stock}
                    onChange={(e) =>
                      updateVariation(index, "stock", e.target.value)
                    }
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariation(index)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addVariation}
            className="flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar variação
          </button>
        </div>

        {/* SEO */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meta Title
              </label>
              <input
                value={form.metaTitle}
                onChange={(e) =>
                  setForm({ ...form, metaTitle: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meta Description
              </label>
              <textarea
                rows={2}
                value={form.metaDescription}
                onChange={(e) =>
                  setForm({ ...form, metaDescription: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
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
            {loading ? "Salvando..." : "Criar Produto"}
          </button>
          <Link
            href="/admin/products"
            className="rounded-xl border border-gray-300 px-8 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
