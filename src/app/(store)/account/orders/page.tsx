"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: { title: string; quantity: number }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Pago", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-gray-800">
        Meus Pedidos
      </h2>

      {orders.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-4xl">📦</div>
          <p className="text-gray-500">Você ainda não fez nenhum pedido.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-medium text-pink-600 hover:text-pink-700"
          >
            Começar a comprar →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusLabels[order.status] || statusLabels.PENDING;
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-xl border border-gray-200 p-4 transition hover:border-pink-200 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">
                      Pedido #{order.orderNumber}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")} -{" "}
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                    <p className="mt-1 font-semibold text-gray-800">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
