"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Search, Eye } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  user: { name: string; email: string };
  items: { id: string }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Pago", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, search]);

  async function fetchOrders() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="SHIPPED">Enviado</option>
          <option value="DELIVERED">Entregue</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Pedido</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Itens</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Total</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Data</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const s = statusLabels[order.status] || statusLabels.PENDING;
                  return (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-800">#{order.orderNumber}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800">{order.user.name}</p>
                        <p className="text-xs text-gray-400">{order.user.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.items.length}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{formatCurrency(order.total)}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-6 py-4">
                        <Link href={`/admin/orders/${order.id}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 inline-block">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
