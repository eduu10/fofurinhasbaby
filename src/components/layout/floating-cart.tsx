"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";

export function FloatingCart() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const [animate, setAnimate] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bounce when item count increases
  useEffect(() => {
    if (itemCount > prevCount && prevCount >= 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevCount(itemCount);
  }, [itemCount, prevCount]);

  // Periodic wiggle to draw attention
  useEffect(() => {
    if (itemCount === 0) return;
    const interval = setInterval(() => {
      setWiggle(true);
      setTimeout(() => setWiggle(false), 800);
    }, 5000);
    return () => clearInterval(interval);
  }, [itemCount]);

  if (!mounted || itemCount === 0) return null;

  return (
    <>
      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-6deg) scale(1.1); }
          30% { transform: rotate(6deg) scale(1.1); }
          45% { transform: rotate(-4deg) scale(1.05); }
          60% { transform: rotate(4deg) scale(1.05); }
          75% { transform: rotate(-2deg) scale(1); }
        }
      `}</style>
      <Link
        href="/cart"
        className={`fixed bottom-24 right-6 z-50 flex flex-col items-center rounded-2xl bg-gradient-buy py-2.5 px-4 text-white font-display font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all ${
          animate ? "scale-110" : ""
        }`}
        style={wiggle ? { animation: "wiggle 0.8s ease-in-out" } : undefined}
      >
        <div className="relative">
          <ShoppingCart size={22} strokeWidth={3} />
          <span className="absolute -top-2 -right-3 bg-white text-accent-orange text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        </div>
        <span className="text-xs mt-1">
          {formatCurrency(getSubtotal())}
        </span>
      </Link>
    </>
  );
}
