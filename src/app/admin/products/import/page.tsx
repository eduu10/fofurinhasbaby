"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Import,
  Loader2,
  Search,
  Star,
  ShoppingCart,
  Check,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchProduct {
  productId: string;
  title: string;
  images: string[];
  priceUSD: number;
  originalPriceUSD: number;
  rating: number;
  ordersCount: number;
  stock: number;
  productUrl: string;
  source: string;
}

interface ImportedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  costPrice: number;
  images: { url: string }[];
  variations: { name: string; value: string; price?: number | null }[];
}

interface ApiUsage {
  used: number;
  limit: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ImportProductPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"url" | "search">("url");

  // URL import state
  const [url, setUrl] = useState("");
  const [profitMargin, setProfitMargin] = useState("150");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<ImportedProduct | null>(null);

  // Search state
  const [keyword, setKeyword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [batchMargins, setBatchMargins] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);

  // =========================================================================
  // Importar por URL
  // =========================================================================

  async function handleUrlImport() {
    if (!url.trim()) {
      toast.error("Cole o link do produto do AliExpress");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/import-aliexpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "url",
          url,
          profitMargin: parseFloat(profitMargin),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const product = json.data.product;
        setImported({
          id: product.id,
          title: product.title,
          description: product.description || "",
          price: product.price,
          costPrice: product.costPrice || 0,
          images: product.images || [],
          variations: product.variations || [],
        });
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

  // =========================================================================
  // Buscar por keyword
  // =========================================================================

  async function handleSearch() {
    if (!keyword.trim()) {
      toast.error("Digite uma palavra-chave para buscar");
      return;
    }

    setSearchLoading(true);
    setSearchResults([]);
    setSelectedProducts(new Set());

    try {
      const res = await fetch("/api/admin/import-aliexpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "search",
          keyword: keyword.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data.products || []);
        setApiUsage(json.data.apiUsage || null);

        if ((json.data.products || []).length === 0) {
          toast("Nenhum produto encontrado. Tente outra keyword.", { icon: "🔍" });
        }
      } else {
        toast.error(json.error || "Erro na busca");
      }
    } catch {
      toast.error("Erro ao buscar produtos");
    } finally {
      setSearchLoading(false);
    }
  }

  // =========================================================================
  // Seleção de produtos
  // =========================================================================

  const toggleSelect = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedProducts.size === searchResults.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(searchResults.map((p) => p.productId)));
    }
  }, [searchResults, selectedProducts.size]);

  // =========================================================================
  // Importar selecionados
  // =========================================================================

  async function handleBatchImport() {
    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    setImporting(true);
    try {
      const productsToImport = searchResults.filter((p) =>
        selectedProducts.has(p.productId),
      );

      const res = await fetch("/api/admin/import-aliexpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import-batch",
          products: productsToImport,
          profitMargin: parseFloat(profitMargin),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const summary = json.data.summary;
        toast.success(summary.message);
        setSelectedProducts(new Set());
      } else {
        toast.error(json.error || "Erro ao importar");
      }
    } catch {
      toast.error("Erro ao importar produtos");
    } finally {
      setImporting(false);
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Importar do AliExpress
          </h1>
          <p className="text-sm text-gray-500">
            Importe por URL ou busque por keyword para importação em lote
          </p>
        </div>
      </div>

      {/* API Usage Alert */}
      {apiUsage && apiUsage.percentage >= 80 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Uso da API: {apiUsage.used}/{apiUsage.limit} requisições ({apiUsage.percentage}%)
            </p>
            <p className="text-xs text-amber-600">
              O limite mensal está quase atingido. Use com moderação.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("url")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "url"
              ? "border-pink-500 text-pink-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Importar por URL
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "search"
              ? "border-pink-500 text-pink-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Buscar por Keyword
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB: Import by URL */}
      {/* ================================================================= */}
      {activeTab === "url" && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Link do produto no AliExpress *
              </label>
              <input
                placeholder="https://www.aliexpress.com/item/1234567890.html"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
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
                  Markup de 150% = preço final 2.5x o custo com impostos
                </p>
              </div>
            </div>

            <button
              onClick={handleUrlImport}
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

          {/* Imported Product Preview */}
          {imported && (
            <div className="mt-6 border-t pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Produto Importado
                </h2>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                  Rascunho
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
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
      )}

      {/* ================================================================= */}
      {/* TAB: Search by Keyword */}
      {/* ================================================================= */}
      {activeTab === "search" && (
        <>
          {/* Search Bar */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex gap-3">
              <input
                placeholder="Ex: baby bodysuit cotton, mordedor silicone, chocalho..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading || !keyword.trim()}
                className="flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
              >
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </div>

            {/* Margem global para lote */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm text-gray-600">Margem padrão:</label>
              <input
                type="number"
                min="0"
                max="500"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">%</span>

              {apiUsage && (
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  API: {apiUsage.used}/{apiUsage.limit}
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              {/* Batch actions */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={selectAll}
                    className="text-sm text-pink-600 hover:underline"
                  >
                    {selectedProducts.size === searchResults.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedProducts.size} de {searchResults.length} selecionado(s)
                  </span>
                </div>

                <button
                  onClick={handleBatchImport}
                  disabled={importing || selectedProducts.size === 0}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Import className="h-4 w-4" />
                      Importar Selecionados ({selectedProducts.size})
                    </>
                  )}
                </button>
              </div>

              {/* Product Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchResults.map((product) => {
                  const isSelected = selectedProducts.has(product.productId);
                  const customMargin = batchMargins[product.productId];

                  return (
                    <div
                      key={product.productId}
                      onClick={() => toggleSelect(product.productId)}
                      className={`relative cursor-pointer rounded-xl border-2 p-3 transition ${
                        isSelected
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div
                        className={`absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full ${
                          isSelected
                            ? "bg-pink-600 text-white"
                            : "border-2 border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>

                      {/* Product image */}
                      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 mb-3">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <h4 className="text-xs font-medium text-gray-800 line-clamp-2 mb-2">
                        {product.title}
                      </h4>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-blue-600">
                          US$ {product.priceUSD.toFixed(2)}
                        </span>
                        {product.originalPriceUSD > 0 && product.originalPriceUSD > product.priceUSD && (
                          <span className="text-xs text-gray-400 line-through">
                            US$ {product.originalPriceUSD.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {product.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            {product.rating.toFixed(1)}
                          </span>
                        )}
                        {product.ordersCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            {product.ordersCount} vendas
                          </span>
                        )}
                      </div>

                      {/* Individual margin override */}
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          placeholder={`${profitMargin}%`}
                          value={customMargin ?? ""}
                          onChange={(e) =>
                            setBatchMargins((prev) => ({
                              ...prev,
                              [product.productId]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-pink-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
