"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Zap, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface FlashProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice: number;
  image: string;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
}

interface FlashSaleBannerProps {
  products: FlashProduct[];
}

function FlashCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    function getTimeLeft() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    }
    setTimeLeft(getTimeLeft());
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex gap-2 justify-center">
      {[
        { value: timeLeft.hours, label: "Horas" },
        { value: timeLeft.minutes, label: "Min" },
        { value: timeLeft.seconds, label: "Seg" },
      ].map((item, i) => (
        <div key={i} className="text-center">
          <div className="bg-white text-gray-800 font-mono font-bold text-2xl sm:text-3xl w-14 sm:w-16 h-14 sm:h-16 rounded-xl flex items-center justify-center shadow-lg">
            {pad(item.value)}
          </div>
          <span className="text-white/80 text-[10px] font-bold uppercase mt-1 block">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FlashSaleBanner({ products }: FlashSaleBannerProps) {
  const addItem = useCartStore((s) => s.addItem);

  if (products.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-pink-500 via-orange-400 to-pink-500 py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-[10%] w-20 h-20 bg-white rounded-full animate-pulse" />
        <div className="absolute bottom-4 right-[15%] w-16 h-16 bg-white rounded-full animate-bounce" />
        <div className="absolute top-1/2 left-[50%] w-12 h-12 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
            <Zap size={20} className="text-yellow-300 fill-yellow-300" />
            <span className="text-white font-display font-bold text-lg">
              OFERTA RELAMPAGO
            </span>
            <Zap size={20} className="text-yellow-300 fill-yellow-300" />
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
            Descontos que acabam hoje!
          </h2>

          <FlashCountdown />
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {products.slice(0, 4).map((product) => {
            const discountPercent = Math.round(
              ((product.compareAtPrice - product.price) /
                product.compareAtPrice) *
                100,
            );

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xl group hover:-translate-y-1 transition-all"
              >
                <Link href={`/products/${product.slug}`}>
                  <div className="relative h-36 sm:h-44 overflow-hidden bg-gray-100">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />
                    <div className="absolute top-2 right-2 bg-red-500 text-white font-bold py-1 px-2 rounded-lg text-xs shadow-lg">
                      -{discountPercent}%
                    </div>
                  </div>
                </Link>

                <div className="p-3">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-display font-bold text-xs sm:text-sm text-gray-800 line-clamp-2 leading-tight">
                      {product.title}
                    </h3>
                  </Link>

                  <div className="mt-2">
                    <span className="text-gray-400 text-xs line-through block">
                      {formatCurrency(product.compareAtPrice)}
                    </span>
                    <span className="text-lg font-display font-bold text-accent-orange">
                      {formatCurrency(product.price)}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      addItem(
                        {
                          id: product.id,
                          title: product.title,
                          price: product.price,
                          compareAtPrice: product.compareAtPrice,
                          image: product.image,
                          slug: product.slug,
                          stock: product.stock,
                          minQuantity: product.minQuantity,
                          maxQuantity: product.maxQuantity,
                        },
                        product.minQuantity || 1,
                      )
                    }
                    className="w-full mt-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-display font-bold py-2 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs sm:text-sm animate-pulse hover:animate-none"
                  >
                    <ShoppingCart size={14} />
                    APROVEITAR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
