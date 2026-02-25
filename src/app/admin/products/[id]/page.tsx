"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface Variation {
  id?: string;
  name: string;
  value: string;
  price: string;
  stock: string;
  sku: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
    Promise.all([
      fetch(`/api/admin/products/${id}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([prodJson, catJson]) => {
      if (catJson.success) setCategories(catJson.data);
      if (prodJson.success) {
        const p = prodJson.data;
        setForm({
          title: p.title || "",
          description: p.description || "",
          shortDescription: p.shortDescription || "",
          sku: p.sku || "",
          price: p.price?.toString() || "",
          compareAtPrice: p.compareAtPrice?.toString() || "",
          costPrice: p.costPrice?.toString() || "",
          stock: p.stock?.toString() || "0",
          minQuantity: p.minQuantity?.toString() || "1",
          maxQuantity: p.maxQuantity?.toString() || "99",
          showStock: p.showStock ?? true,
          isActive: p.isActive ?? true,
          isDraft: p.isDraft ?? false,
          isFeatured: p.isFeatured ?? false,
          categoryId: p.categoryId || "",
          weight: p.weight?.toString() || "",
          metaTitle: p.metaTitle || "",
          metaDescription: p.metaDescription || "",
        });
        setImageUrls(
          p.images?.length > 0
            ? p.images.map((img: { url: string }) => img.url)
            : [""]
        );
        setVariations(
          p.variations?.map((v: { id: string; name: string; value: string; price: string | null; stock: number; sku: string | null }) => ({
            id: v.id,
            name: v.name,
            value: v.value,
            price: v.price?.toString() || "",
            stock: v.stock?.toString() || "0",
            sku: v.sku || "",
          })) || []
        );
      }
      setFetching(false);
    });
  }, [id]);

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
        stock: parseInt(form.stock) || 0,
        minQuantity: parseInt(form.minQuantity) || 1,
        maxQuantity: parseInt(form.maxQuantity) || 99,
        weight: form.weight ? parseFloat(form.weight) : null,
        categoryId: form.categoryId || null,
        sku: form.sku || null,
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

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Produto atualizado com sucesso!");
        router.push("/admin/products");
      } else {
        toast.error(json.error || "Erro ao atualizar produto");
      }
    } catch {
      toast.error("Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
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
        <h1 className="text-2xl font-bold text-gray-800">Editar Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Same form fields as new product - reusing the same layout */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Informações Básicas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">Título *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div className="col-span-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">Descrição curta</label>
              <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div className="col-span-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">Descrição completa</label>
              <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none">
                <option value="">Sem categoria</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Preço e Estoque</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Preço de venda (R$) *</label><input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Preço comparativo (R$)</label><input type="number" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Preço de custo (R$)</label><input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Estoque</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Qtd mínima</label><input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Qtd máxima</label><input type="number" value={form.maxQuantity} onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showStock} onChange={(e) => setForm({ ...form, showStock: e.target.checked })} className="accent-pink-600" /> Exibir estoque</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="accent-pink-600" /> Produto em destaque</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDraft} onChange={(e) => setForm({ ...form, isDraft: e.target.checked })} className="accent-pink-600" /> Rascunho</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-pink-600" /> Ativo</label>
          </div>
        </div>

        {/* Images */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Imagens</h2>
          {/* Image previews */}
          {imageUrls.some((u) => u.trim()) && (
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {imageUrls.filter((u) => u.trim()).map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <img src={url} alt={`Imagem ${i + 1}`} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x200/f3f4f6/999?text=Erro"; }} />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input placeholder="URL da imagem" value={url} onChange={(e) => { const u = [...imageUrls]; u[index] = e.target.value; setImageUrls(u); }} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
                {imageUrls.length > 1 && <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))} className="rounded-xl p-3 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            <button type="button" onClick={() => setImageUrls([...imageUrls, ""])} className="flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700"><Plus className="h-4 w-4" /> Adicionar imagem</button>
          </div>
        </div>

        {/* Variations */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Variações</h2>
          {variations.length > 0 && (
            <div className="mb-4 space-y-3">
              {variations.map((v, index) => (
                <div key={index} className="flex flex-wrap gap-2 rounded-xl border border-gray-200 p-3">
                  <input placeholder="Nome" value={v.name} onChange={(e) => updateVariation(index, "name", e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[120px]" />
                  <input placeholder="Valor" value={v.value} onChange={(e) => updateVariation(index, "value", e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[120px]" />
                  <input placeholder="Preço" type="number" step="0.01" value={v.price} onChange={(e) => updateVariation(index, "price", e.target.value)} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder="Estoque" type="number" value={v.stock} onChange={(e) => updateVariation(index, "stock", e.target.value)} className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => removeVariation(index)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addVariation} className="flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700"><Plus className="h-4 w-4" /> Adicionar variação</button>
        </div>

        {/* SEO */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">SEO</h2>
          <div className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Meta Title</label><input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Meta Description</label><textarea rows={2} value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" /></div>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="rounded-xl bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50">{loading ? "Salvando..." : "Salvar Alterações"}</button>
          <Link href="/admin/products" className="rounded-xl border border-gray-300 px-8 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
