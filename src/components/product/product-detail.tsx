"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";
import { ProductGrid } from "./product-grid";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { saveRecentlyViewed } from "@/components/home/recently-viewed";
import { Minus, Plus, ShoppingCart, Star, ChevronLeft, ChevronRight, Truck, ShieldCheck, Heart, MapPin, Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductVariation {
  id: string;
  name: string;
  value: string;
  price: number | null;
  stock: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string; image: string | null };
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
  showStock: boolean;
  images: ProductImage[];
  variations: ProductVariation[];
  category: { name: string; slug: string } | null;
  reviews: Review[];
}

interface ShippingEstimate {
  method: string;
  price: number;
  days: string;
  city?: string;
  state?: string;
}

interface Props {
  product: Product;
  relatedProducts: unknown[];
}

type TabKey = "description" | "reviews" | "shipping";

export function ProductDetail({ product, relatedProducts }: Props) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [quantity, setQuantity] = useState(product.minQuantity);
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [isZooming, setIsZooming] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // CEP Shipping Calculator
  const [cep, setCep] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingEstimates, setShippingEstimates] = useState<ShippingEstimate[]>([]);

  const currentPrice = selectedVariation?.price || product.price;
  const currentStock = selectedVariation?.stock ?? product.stock;
  const isOutOfStock = currentStock <= 0;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(currentPrice);
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.compareAtPrice) - Number(currentPrice)) / Number(product.compareAtPrice)) * 100)
    : 0;

  // Group variations by name
  const variationGroups: Record<string, ProductVariation[]> = {};
  product.variations.forEach((v) => {
    if (!variationGroups[v.name]) variationGroups[v.name] = [];
    variationGroups[v.name].push(v);
  });

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : 0;

  // Save to recently viewed on mount
  useEffect(() => {
    saveRecentlyViewed({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: Number(product.price),
      image: product.images[0]?.url || "",
    });
  }, [product.id, product.title, product.slug, product.price, product.images]);

  // Zoom on hover
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: "scale(2)",
    });
    setIsZooming(true);
  }

  function handleMouseLeave() {
    setZoomStyle({});
    setIsZooming(false);
  }

  // CEP lookup
  async function handleCepLookup() {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      toast.error("CEP invalido. Informe 8 digitos.");
      return;
    }

    setShippingLoading(true);
    try {
      const res = await fetch("/api/aliexpress/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity, cep: cleanCep }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const options = Array.isArray(data.data) ? data.data : [data.data];
        setShippingEstimates(options.map((o: { serviceName?: string; method?: string; freightAmount?: number; price?: number; estimatedDeliveryDays?: string; days?: string; city?: string; state?: string }) => ({
          method: o.serviceName || o.method || "Envio Padrao",
          price: o.freightAmount ?? o.price ?? 0,
          days: o.estimatedDeliveryDays || o.days || "7-15 dias uteis",
          city: o.city,
          state: o.state,
        })));
      } else {
        // Fallback estimate
        setShippingEstimates([{
          method: "Envio Padrao",
          price: 19.90,
          days: "10-20 dias uteis",
        }]);
      }
    } catch {
      setShippingEstimates([{
        method: "Envio Padrao",
        price: 19.90,
        days: "10-20 dias uteis",
      }]);
    } finally {
      setShippingLoading(false);
    }
  }

  function handleAddToCart() {
    if (isOutOfStock) return;
    addItem(
      {
        id: product.id,
        title: product.title,
        price: Number(currentPrice),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        image: product.images[0]?.url || "",
        slug: product.slug,
        stock: currentStock,
        minQuantity: product.minQuantity,
        maxQuantity: product.maxQuantity,
      },
      quantity,
      selectedVariation
        ? {
            id: selectedVariation.id,
            name: selectedVariation.name,
            value: selectedVariation.value,
            price: selectedVariation.price ? Number(selectedVariation.price) : null,
          }
        : null
    );
    toast.success("Produto adicionado ao carrinho!");
  }

  function handleBuyNow() {
    handleAddToCart();
    router.push("/checkout");
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "description", label: "Descricao" },
    { key: "reviews", label: "Avaliacoes", count: product.reviews.length },
    { key: "shipping", label: "Envio e Politica" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Produtos", href: "/products" },
        ...(product.category ? [{ label: product.category.name, href: `/products?category=${product.category.slug}` }] : []),
        { label: product.title },
      ]} />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images with Zoom */}
        <div>
          <div
            ref={imageRef}
            className="relative aspect-square overflow-hidden rounded-3xl bg-gray-100 border-2 border-baby-blue/20 cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]?.url}
                alt={product.images[selectedImage]?.alt || product.title}
                className="h-full w-full object-cover transition-transform duration-200"
                style={isZooming ? zoomStyle : {}}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Sem imagem
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-4 left-0 flex flex-col gap-1.5 z-10">
              {hasDiscount && (
                <div className="bg-gradient-offer text-white font-display font-bold py-1.5 px-5 rounded-r-full shadow-md text-sm">
                  -{discountPercent}% OFF
                </div>
              )}
              {Number(currentPrice) >= 99 && (
                <div className="bg-green-500 text-white font-bold py-1 px-4 rounded-r-full shadow-md text-xs flex items-center gap-1">
                  <Truck size={12} /> FRETE GRATIS
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white z-20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedImage(Math.min(product.images.length - 1, selectedImage + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white z-20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    selectedImage === i ? "border-baby-blue shadow-pastel" : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.category && (
            <Link href={`/products?category=${product.category.slug}`} className="mb-2 text-sm font-bold uppercase tracking-wider text-baby-blue hover:text-blue-400 transition-colors inline-block">
              {product.category.name}
            </Link>
          )}

          <h1 className="font-display text-3xl font-bold text-gray-800">{product.title}</h1>

          {/* Rating */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex text-accent-yellow">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  fill={star <= avgRating ? "currentColor" : "none"}
                  strokeWidth={star <= avgRating ? 0 : 2}
                  className={star <= avgRating ? "" : "text-gray-300"}
                />
              ))}
            </div>
            <button
              onClick={() => setActiveTab("reviews")}
              className="text-sm text-gray-500 font-bold hover:text-baby-pink transition-colors"
            >
              ({product.reviews.length} {product.reviews.length === 1 ? "avaliacao" : "avaliacoes"})
            </button>
          </div>

          {/* Price */}
          <div className="mt-4 bg-gray-50 rounded-2xl p-4">
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400 line-through font-bold">
                  {formatCurrency(product.compareAtPrice!)}
                </span>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -{discountPercent}%
                </span>
              </div>
            )}
            <p className="text-3xl font-display font-bold text-accent-orange">
              {formatCurrency(currentPrice)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              ou <strong>12x</strong> de <strong>{formatCurrency(Number(currentPrice) / 12)}</strong> sem juros
            </p>
            <p className="text-xs text-green-600 font-bold mt-1">
              {formatCurrency(Number(currentPrice) * 0.95)} no PIX (5% de desconto)
            </p>
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-gray-600">{product.shortDescription}</p>
          )}

          {/* Variations */}
          {Object.entries(variationGroups).map(([name, variations]) => (
            <div key={name} className="mt-6">
              <p className="mb-2 text-sm font-bold text-gray-700">{name}:</p>
              <div className="flex flex-wrap gap-2">
                {variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition ${
                      selectedVariation?.id === v.id
                        ? "border-baby-blue bg-baby-blue/10 text-baby-blue"
                        : "border-gray-200 text-gray-700 hover:border-baby-blue/50"
                    } ${v.stock <= 0 ? "opacity-50 line-through" : ""}`}
                    disabled={v.stock <= 0}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div className="mt-6">
            <p className="mb-2 text-sm font-bold text-gray-700">Quantidade:</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(product.minQuantity, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-200 hover:border-baby-blue/50 hover:bg-baby-blue/5 transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-lg font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.maxQuantity, quantity + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-200 hover:border-baby-blue/50 hover:bg-baby-blue/5 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {product.showStock && (
              <p className="mt-2 text-sm text-gray-500">
                {isOutOfStock ? (
                  <span className="text-red-500 font-bold">Produto esgotado</span>
                ) : currentStock <= 5 ? (
                  <span className="text-amber-600 font-bold animate-pulse">Apenas {currentStock} em estoque!</span>
                ) : (
                  `${currentStock} em estoque`
                )}
              </p>
            )}
          </div>

          {/* CEP Shipping Calculator */}
          <div className="mt-6 border-2 border-gray-100 rounded-2xl p-4">
            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Truck size={16} className="text-baby-blue" />
              Calcular Frete e Prazo
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Seu CEP"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  onKeyDown={(e) => e.key === "Enter" && handleCepLookup()}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-baby-blue focus:outline-none"
                  maxLength={9}
                />
              </div>
              <button
                onClick={handleCepLookup}
                disabled={shippingLoading}
                className="bg-baby-blue text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-400 transition-colors disabled:opacity-50"
              >
                {shippingLoading ? <Loader2 size={16} className="animate-spin" /> : "Calcular"}
              </button>
            </div>
            {shippingEstimates.length > 0 && (
              <div className="mt-3 space-y-2">
                {shippingEstimates.map((est, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-sm">
                    <div>
                      <p className="font-bold text-gray-700">{est.method}</p>
                      <p className="text-xs text-gray-500">{est.days}{est.city ? ` - ${est.city}/${est.state}` : ""}</p>
                    </div>
                    <span className={`font-bold ${est.price === 0 ? "text-green-600" : "text-gray-800"}`}>
                      {est.price === 0 ? "GRATIS" : formatCurrency(est.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-buy py-4 text-lg font-display font-bold text-white shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={3} />
              {isOutOfStock ? "ESGOTADO" : "COMPRAR AGORA"}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-baby-blue py-3.5 text-base font-display font-bold text-baby-blue transition-all hover:bg-baby-blue/5 active:scale-95 disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" />
              ADICIONAR AO CARRINHO
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: "Compra Segura" },
              { icon: Truck, label: "Envio Rastreado" },
              { icon: Package, label: "7 Dias p/ Troca" },
            ].map((badge) => (
              <div key={badge.label} className="flex flex-col items-center text-center gap-1 bg-gray-50 rounded-xl py-3 px-2">
                <badge.icon size={18} className="text-baby-blue" />
                <span className="text-[10px] font-bold text-gray-500">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-12">
        <div className="flex border-b border-gray-200 gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.key
                  ? "border-baby-pink text-baby-pink"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 bg-baby-pink/10 text-baby-pink text-xs font-bold px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border-2 border-baby-blue/20 bg-white p-8 shadow-sm">
          {/* Description Tab */}
          {activeTab === "description" && (
            <div>
              {product.description ? (
                <div className="prose max-w-none text-gray-600 whitespace-pre-line">
                  {product.description}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Nenhuma descricao disponivel para este produto.</p>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div>
              {product.reviews.length > 0 ? (
                <>
                  {/* Review Summary */}
                  <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-100">
                    <div className="text-center">
                      <p className="text-4xl font-display font-bold text-gray-800">{avgRating.toFixed(1)}</p>
                      <div className="flex text-accent-yellow mt-1 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill={star <= avgRating ? "currentColor" : "none"}
                            strokeWidth={star <= avgRating ? 0 : 2}
                            className={star <= avgRating ? "" : "text-gray-300"}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{product.reviews.length} avaliacoes</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = product.reviews.filter((r) => r.rating === stars).length;
                        const pct = product.reviews.length > 0 ? (count / product.reviews.length) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2 text-sm">
                            <span className="w-3 text-gray-500">{stars}</span>
                            <Star size={10} fill="currentColor" className="text-accent-yellow" strokeWidth={0} />
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-accent-yellow rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-6 text-xs text-gray-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-6">
                    {product.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-baby-pink to-accent-orange text-sm font-bold text-white">
                            {review.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{review.user.name}</p>
                            <div className="flex text-accent-yellow">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  fill={star <= review.rating ? "currentColor" : "none"}
                                  strokeWidth={star <= review.rating ? 0 : 2}
                                  className={star <= review.rating ? "" : "text-gray-300"}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="ml-auto text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {review.comment && <p className="mt-3 text-sm text-gray-600">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Star size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhuma avaliacao ainda. Seja o primeiro a avaliar!</p>
                </div>
              )}
            </div>
          )}

          {/* Shipping & Policy Tab */}
          {activeTab === "shipping" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display font-bold text-gray-800 mb-3">Prazo de Entrega</h3>
                <p className="text-sm text-gray-600">
                  Nossos produtos sao enviados diretamente para sua casa. O prazo estimado de entrega varia entre <strong>7 a 25 dias uteis</strong> dependendo da sua regiao.
                </p>
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-800 mb-3">Politica de Trocas e Devolucoes</h3>
                <p className="text-sm text-gray-600">
                  Voce tem ate <strong>7 dias corridos</strong> apos o recebimento para solicitar troca ou devolucao. O produto deve estar em perfeitas condicoes, sem uso, na embalagem original.
                </p>
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-800 mb-3">Rastreamento</h3>
                <p className="text-sm text-gray-600">
                  Apos o envio, voce recebera o codigo de rastreamento por e-mail para acompanhar sua encomenda em tempo real.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 font-display text-xl font-bold text-gradient-pink">Voce tambem vai amar</h2>
          <ProductGrid products={relatedProducts as never[]} />
        </div>
      )}
    </div>
  );
}
