"use client";

import { useState, useEffect, use } from "react";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Truck, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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
  paymentStatus: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string; email: string; phone: string | null };
  address: {
    street: string;
    number: string;
    complement: string | null;
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
    variation: { name: string; value: string } | null;
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

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setOrder(json.data);
          setNewStatus(json.data.status);
          setTrackingCode(json.data.trackingCode || "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdateStatus() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          trackingCode,
          note: statusNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Status atualizado!");
        // Refetch order
        const refetch = await fetch(`/api/admin/orders/${id}`);
        const refetchJson = await refetch.json();
        if (refetchJson.success) {
          setOrder(refetchJson.data);
          setStatusNote("");
        }
      } else {
        toast.error(json.error || "Erro ao atualizar status");
      }
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) return <p className="py-12 text-center text-gray-500">Pedido não encontrado.</p>;

  const status = statusLabels[order.status] || statusLabels.PENDING;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Pedido #{order.orderNumber}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>{status.label}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Order Info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">Itens do Pedido</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.title}</p>
                    {item.variation && <p className="text-xs text-gray-500">{item.variation.name}: {item.variation.value}</p>}
                  </div>
                  <p className="text-sm text-gray-500">x{item.quantity}</p>
                  <p className="font-medium text-gray-800">{formatCurrency(parseFloat(item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>
            <hr className="my-4" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Frete</span><span>{parseFloat(order.shipping) > 0 ? formatCurrency(order.shipping) : "Grátis"}</span></div>
              {parseFloat(order.discount) > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span><span>-{formatCurrency(order.discount)}</span></div>}
              <hr />
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            </div>
          </div>

          {/* Customer */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-800">Cliente</h2>
              <p className="text-sm text-gray-800">{order.user.name}</p>
              <p className="text-sm text-gray-500">{order.user.email}</p>
              {order.user.phone && <p className="text-sm text-gray-500">{order.user.phone}</p>}
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-800">Endereço</h2>
              <p className="text-sm text-gray-800">{order.address.street}, {order.address.number}{order.address.complement ? ` - ${order.address.complement}` : ""}</p>
              <p className="text-sm text-gray-500">{order.address.neighborhood}, {order.address.city} - {order.address.state}</p>
              <p className="text-sm text-gray-500">{order.address.zipCode}</p>
            </div>
          </div>

          {/* History */}
          {order.history.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-800">Histórico</h2>
              <div className="space-y-3">
                {order.history.map((h, i) => {
                  const s = statusLabels[h.status] || statusLabels.PENDING;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.label}</p>
                        {h.note && <p className="text-sm text-gray-500">{h.note}</p>}
                        <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status Update */}
        <div>
          <div className="sticky top-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">Atualizar Status</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Novo status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none">
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                  <option value="SHIPPED">Enviado</option>
                  <option value="DELIVERED">Entregue</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Código de rastreio</label>
                <div className="flex gap-2">
                  <Truck className="mt-3 h-4 w-4 text-gray-400" />
                  <input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="Ex: BR123456789" className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Observação</label>
                <textarea rows={3} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Nota sobre a atualização..." className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
              </div>
              <button onClick={handleUpdateStatus} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Atualizar Status"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
