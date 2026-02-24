"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";
import { ProductGrid } from "./product-grid";
import { Minus, Plus, ShoppingCart, Star, ChevronLeft, ChevronRight } from "lucide-react";
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

interface Props {
  product: Product;
  relatedProducts: unknown[];
}

export function ProductDetail({ product, relatedProducts }: Props) {
  const { addItem } = useCartStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [quantity, setQuantity] = useState(product.minQuantity);

  const currentPrice = selectedVariation?.price || product.price;
  const currentStock = selectedVariation?.stock ?? product.stock;
  const isOutOfStock = currentStock <= 0;

  // Group variations by name
  const variationGroups: Record<string, ProductVariation[]> = {};
  product.variations.forEach((v) => {
    if (!variationGroups[v.name]) variationGroups[v.name] = [];
    variationGroups[v.name].push(v);
  });

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : 0;

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]?.url}
                alt={product.images[selectedImage]?.alt || product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Sem imagem
              </div>
            )}
            {product.compareAtPrice && (
              <span className="absolute left-4 top-4 rounded-full bg-gradient-offer px-4 py-1.5 text-sm font-bold text-white shadow-sm animate-pulse-soft">
                SUPER OFERTA!
              </span>
            )}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedImage(Math.min(product.images.length - 1, selectedImage + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
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
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    selectedImage === i ? "border-pink-400 shadow-pink-glow" : "border-transparent"
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
            <p className="mb-2 text-sm font-medium text-pink-500">
              {product.category.name}
            </p>
          )}

          <h1 className="text-3xl font-bold text-gray-800">{product.title}</h1>

          {/* Rating */}
          {product.reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= avgRating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({product.reviews.length} {product.reviews.length === 1 ? "avaliação" : "avaliações"})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mt-4">
            {product.compareAtPrice && (
              <p className="text-sm text-gray-400 line-through">
                {formatCurrency(product.compareAtPrice)}
              </p>
            )}
            <p className="text-3xl font-extrabold text-gradient-pink">
              {formatCurrency(currentPrice)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              ou 12x de {formatCurrency(Number(currentPrice) / 12)}
            </p>
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-gray-600">{product.shortDescription}</p>
          )}

          {/* Variations */}
          {Object.entries(variationGroups).map(([name, variations]) => (
            <div key={name} className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-700">{name}:</p>
              <div className="flex flex-wrap gap-2">
                {variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className={`rounded-xl border-2 px-4 py-2 text-sm transition ${
                      selectedVariation?.id === v.id
                        ? "border-pink-400 bg-pink-50 text-pink-600"
                        : "border-pink-100 text-gray-700 hover:border-pink-300"
                    } ${v.stock <= 0 ? "opacity-50" : ""}`}
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
            <p className="mb-2 text-sm font-medium text-gray-700">Quantidade:</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(product.minQuantity, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200 hover:bg-pink-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.maxQuantity, quantity + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200 hover:bg-pink-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {product.showStock && (
              <p className="mt-2 text-sm text-gray-500">
                {isOutOfStock ? (
                  <span className="text-red-500">Produto esgotado</span>
                ) : (
                  `${currentStock} em estoque`
                )}
              </p>
            )}
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-gradient-button py-4 text-base font-bold text-white transition-all hover:shadow-pink-glow hover:scale-[1.02] disabled:opacity-50"
          >
            <ShoppingCart className="h-5 w-5" />
            {isOutOfStock ? "Esgotado" : "Adicionar ao Carrinho ✨"}
          </button>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mt-12 rounded-2xl border border-pink-50 bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">Descrição</h2>
          <div className="prose max-w-none text-gray-600 whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="mt-12 rounded-2xl border border-pink-50 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-gray-800">
            Avaliações ({product.reviews.length})
          </h2>
          <div className="space-y-6">
            {product.reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600">
                    {review.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{review.user.name}</p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                          }`}
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
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-xl font-bold text-gradient-pink">Produtos Relacionados</h2>
          <ProductGrid products={relatedProducts as never[]} />
        </div>
      )}
    </div>
  );
}
