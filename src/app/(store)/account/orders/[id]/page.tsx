"use client";

import { useState, useEffect, use } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  shipping: string;
  discount: string;
  total: string;
  trackingCode: string | null;
  paymentMethod: string | null;
  createdAt: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: {
    id: string;
    title: string;
    price: string;
    quantity: number;
    image: string | null;
    variation?: { name: string; value: string } | null;
  }[];
  history: { status: string; note: string | null; createdAt: string }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Pago", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrder(json.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Pedido não encontrado.</p>
      </div>
    );
  }

  const status = statusLabels[order.status] || statusLabels.PENDING;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/account/orders"
          className="text-sm text-pink-600 hover:text-pink-700"
        >
          ← Voltar
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Pedido #{order.orderNumber}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Realizado em{" "}
              {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        {order.trackingCode && (
          <div className="mt-4 rounded-xl bg-purple-50 p-4">
            <p className="text-sm font-medium text-purple-800">
              Código de rastreio:{" "}
              <span className="font-bold">{order.trackingCode}</span>
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800">Itens do Pedido</h3>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{item.title}</p>
                {item.variation && (
                  <p className="text-sm text-gray-500">
                    {item.variation.name}: {item.variation.value}
                  </p>
                )}
                <p className="text-sm text-gray-500">Qtd: {item.quantity}</p>
              </div>
              <p className="font-medium text-gray-800">
                {formatCurrency(parseFloat(item.price) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <hr className="my-4" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Frete</span>
            <span>
              {parseFloat(order.shipping) > 0
                ? formatCurrency(order.shipping)
                : "Grátis"}
            </span>
          </div>
          {parseFloat(order.discount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <hr />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800">
          Endereço de Entrega
        </h3>
        <p className="text-sm text-gray-700">
          {order.address.street}, {order.address.number}
          {order.address.complement ? ` - ${order.address.complement}` : ""}
        </p>
        <p className="text-sm text-gray-500">
          {order.address.neighborhood}, {order.address.city} -{" "}
          {order.address.state}, {order.address.zipCode}
        </p>
      </div>

      {/* History */}
      {order.history.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-800">
            Histórico do Pedido
          </h3>
          <div className="space-y-3">
            {order.history.map((h, i) => {
              const s = statusLabels[h.status] || statusLabels.PENDING;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {s.label}
                    </p>
                    {h.note && (
                      <p className="text-sm text-gray-500">{h.note}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
