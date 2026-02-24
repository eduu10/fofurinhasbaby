"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Import, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface ImportedProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  costPrice: string;
  images: { url: string }[];
  variations: { name: string; value: string; price: string }[];
}

export default function ImportProductPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [profitMargin, setProfitMargin] = useState("40");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<ImportedProduct | null>(null);
  const [autoSync, setAutoSync] = useState(false);

  async function handleImport() {
    if (!url.trim()) {
      toast.error("Cole o link do produto do AliExpress");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          profitMargin: parseFloat(profitMargin),
          autoSync,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setImported(json.data);
        toast.success("Produto importado como rascunho!");
      } else {
        toast.error(json.error || "Erro ao importar produto");
      }
    } catch {
      toast.error("Erro ao importar produto");
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
        <h1 className="text-2xl font-bold text-gray-800">
          Importar do AliExpress
        </h1>
      </div>

      {/* Import Form */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Importar Produto
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Cole o link do produto do AliExpress e o sistema importará
          automaticamente as informações. O produto será salvo como rascunho para
          que você possa editá-lo antes de publicar.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Link do produto no AliExpress *
            </label>
            <div className="flex gap-2">
              <input
                placeholder="https://www.aliexpress.com/item/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Margem de lucro (%)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <p className="mt-1 text-xs text-gray-400">
                Ex: 40% de margem = preço de custo + 40%
              </p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-3 text-sm">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="accent-pink-600"
                />
                Sincronização automática de preço/estoque
              </label>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Import className="h-4 w-4" />
                Importar Produto
              </>
            )}
          </button>
        </div>
      </div>

      {/* Imported Product Preview */}
      {imported && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Produto Importado (Rascunho)
            </h2>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
              Rascunho
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Images */}
            <div>
              <div className="grid grid-cols-3 gap-2">
                {imported.images.map((img, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={img.url}
                      alt={`Imagem ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {imported.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                {imported.description}
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preço de custo:</span>
                  <span className="text-gray-800">
                    {formatCurrency(imported.costPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Margem:</span>
                  <span className="text-gray-800">{profitMargin}%</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Preço de venda:</span>
                  <span className="text-pink-600">
                    {formatCurrency(imported.price)}
                  </span>
                </div>
              </div>

              {imported.variations.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Variações:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {imported.variations.map((v, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                      >
                        {v.name}: {v.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/admin/products/${imported.id}`}
              className="rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-pink-700"
            >
              Editar e Publicar
            </Link>
            <button
              onClick={() => {
                setImported(null);
                setUrl("");
              }}
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Importar Outro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
