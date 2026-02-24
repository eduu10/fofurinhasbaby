"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, ShieldCheck, Truck } from "lucide-react";
import toast from "react-hot-toast";

interface CartSummaryProps {
  className?: string;
}

export function CartSummary({ className }: CartSummaryProps) {
  const [couponInput, setCouponInput] = useState("");
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  const subtotal = useCartStore((state) => state.getSubtotal());
  const total = useCartStore((state) => state.getTotal());
  const shipping = useCartStore((state) => state.shipping);
  const discount = useCartStore((state) => state.discount);
  const couponCode = useCartStore((state) => state.couponCode);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const items = useCartStore((state) => state.items);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;

    setLoadingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim(),
          subtotal,
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setCoupon(couponInput.trim().toUpperCase(), data.discount);
        toast.success(`Cupom "${couponInput.trim().toUpperCase()}" aplicado!`);
        setCouponInput("");
      } else {
        toast.error(data.message || "Cupom invalido");
      }
    } catch {
      toast.error("Erro ao validar cupom. Tente novamente.");
    } finally {
      setLoadingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null, 0);
    toast.success("Cupom removido");
  };

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-5",
        className
      )}
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        Resumo do Pedido
      </h3>

      {/* Summary lines */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-800">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {shipping > 0 && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Truck className="h-4 w-4" />
              Frete
            </span>
            <span className="font-medium text-gray-800">
              {formatCurrency(shipping)}
            </span>
          </div>
        )}
        {shipping === 0 && subtotal > 0 && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Truck className="h-4 w-4" />
              Frete
            </span>
            <span className="text-xs text-gray-500">
              Calculado no checkout
            </span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="flex items-center gap-1.5">
              <Tag className="h-4 w-4" />
              Desconto
              {couponCode && (
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium">
                  {couponCode}
                </span>
              )}
            </span>
            <span className="font-medium">-{formatCurrency(discount)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between">
            <span className="text-base font-semibold text-gray-800">
              Total
            </span>
            <span className="text-lg font-bold text-pink-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Coupon code input */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        {couponCode ? (
          <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {couponCode}
              </span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Cupom de desconto"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyCoupon}
              loading={loadingCoupon}
              className="flex-shrink-0"
            >
              Aplicar
            </Button>
          </div>
        )}
      </div>

      {/* Checkout button */}
      <Link href="/checkout" className="mt-4 block">
        <Button size="lg" className="w-full">
          Finalizar Compra
        </Button>
      </Link>

      {/* Trust badges */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <span>Compra segura e protegida</span>
      </div>
    </div>
  );
}
