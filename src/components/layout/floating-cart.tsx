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
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    if (itemCount > prevCount && prevCount >= 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevCount(itemCount);
  }, [itemCount, prevCount]);

  if (itemCount === 0) return null;

  return (
    <Link
      href="/cart"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-gradient-buy py-3 px-5 text-white font-display font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all ${
        animate ? "scale-110" : ""
      }`}
    >
      <div className="relative">
        <ShoppingCart size={22} strokeWidth={3} />
        <span className="absolute -top-2 -right-2 bg-white text-accent-orange text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      </div>
      <span className="hidden sm:inline text-sm">
        {formatCurrency(getSubtotal())}
      </span>
    </Link>
  );
}
