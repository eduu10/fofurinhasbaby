"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Package, Truck, CheckCircle, Clock, XCircle, RefreshCw, ChevronRight } from "lucide-react";

interface OrderItem {
  title: string;
  quantity: number;
  product?: { title: string } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string | number;
  createdAt: string;
  trackingCode?: string | null;
  aliexpressOrderId?: string | null;
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package; step: number }> = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock, step: 0 },
  PAID: { label: "Pago", color: "bg-blue-100 text-blue-800", icon: CheckCircle, step: 1 },
  PROCESSING: { label: "Processando", color: "bg-indigo-100 text-indigo-800", icon: RefreshCw, step: 2 },
  SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800", icon: Truck, step: 3 },
  DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800", icon: CheckCircle, step: 4 },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: XCircle, step: -1 },
};

const trackingSteps = [
  { label: "Pedido Confirmado", description: "Pagamento aprovado" },
  { label: "Em Preparacao", description: "Produto sendo preparado" },
  { label: "Enviado", description: "A caminho da sua casa" },
  { label: "Entregue", description: "Pedido recebido" },
];

function OrderTrackingTimeline({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.PENDING;
  if (config.step < 0) return null; // cancelled

  return (
    <div className="flex items-center gap-0 mt-3">
      {trackingSteps.map((step, idx) => {
        const isCompleted = idx < config.step;
        const isCurrent = idx === config.step;
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-baby-pink text-white animate-pulse"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? <CheckCircle size={14} /> : idx + 1}
              </div>
              <p className={`text-[10px] mt-1 text-center font-bold ${
                isCompleted || isCurrent ? "text-gray-700" : "text-gray-400"
              }`}>
                {step.label}
              </p>
            </div>
            {idx < trackingSteps.length - 1 && (
              <div className={`h-0.5 w-full -mt-4 ${
                isCompleted ? "bg-green-300" : "bg-gray-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          // API returns { orders, pagination } inside data
          const data = json.data;
          const list = Array.isArray(data) ? data : data?.orders ?? [];
          setOrders(list);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []);

  async function syncOrderStatus(orderId: string) {
    setSyncingId(orderId);
    try {
      const res = await fetch(`/api/aliexpress/order/${orderId}/status`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: json.data.status || o.status, trackingCode: json.data.trackingCode || o.trackingCode }
              : o
          )
        );
      }
    } catch { /* ignore */ }
    finally { setSyncingId(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-baby-pink border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-display font-bold text-gray-800">
          Meus Pedidos
        </h2>

        {orders.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Voce ainda nao fez nenhum pedido.</p>
            <Link
              href="/products"
              className="mt-4 inline-block text-sm font-bold text-baby-pink hover:text-pink-400 transition-colors"
            >
              Comecar a comprar &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = config.icon;
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border-2 border-gray-100 p-5 transition hover:border-baby-pink/30 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-gray-800">
                        Pedido #{order.orderNumber}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")} -{" "}
                        {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${config.color}`}>
                          <StatusIcon size={12} />
                          {config.label}
                        </span>
                        <p className="mt-1 font-display font-bold text-gray-800">
                          {formatCurrency(Number(order.total))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  <OrderTrackingTimeline status={order.status} />

                  {/* Tracking code + actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {order.trackingCode && (
                        <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-1 rounded-lg">
                          Rastreio: {order.trackingCode}
                        </span>
                      )}
                      {order.aliexpressOrderId && (
                        <button
                          onClick={() => syncOrderStatus(order.id)}
                          disabled={syncingId === order.id}
                          className="text-xs text-baby-blue font-bold hover:text-blue-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={syncingId === order.id ? "animate-spin" : ""} />
                          Atualizar Status
                        </button>
                      )}
                    </div>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-sm text-baby-pink font-bold hover:text-pink-400 transition-colors flex items-center gap-1"
                    >
                      Detalhes <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
