"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface DashboardData {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  pendingOrders: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    createdAt: string;
    user: { name: string };
  }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/finance?period=30d")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
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

  const stats = [
    {
      label: "Total de Produtos",
      value: data?.totalProducts || 0,
      icon: Package,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total de Pedidos",
      value: data?.totalOrders || 0,
      icon: ShoppingCart,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Faturamento",
      value: formatCurrency(data?.totalRevenue || 0),
      icon: DollarSign,
      color: "bg-pink-100 text-pink-600",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(data?.averageTicket || 0),
      icon: TrendingUp,
      color: "bg-amber-100 text-amber-600",
    },
  ];

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
    PAID: { label: "Pago", color: "bg-blue-100 text-blue-800" },
    SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
    DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800" },
    CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Orders Alert */}
      {(data?.pendingOrders || 0) > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            Você tem {data?.pendingOrders} pedido(s) pendente(s) aguardando
            ação.
          </p>
        </div>
      )}

      {/* Recent Orders */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Pedidos Recentes
        </h2>

        {data?.recentOrders && data.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 font-medium text-gray-500">Pedido</th>
                  <th className="pb-3 font-medium text-gray-500">Cliente</th>
                  <th className="pb-3 font-medium text-gray-500">Status</th>
                  <th className="pb-3 font-medium text-gray-500">Total</th>
                  <th className="pb-3 font-medium text-gray-500">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => {
                  const s =
                    statusLabels[order.status] || statusLabels.PENDING;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-3 font-medium text-gray-800">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 text-gray-600">
                        {order.user.name}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-gray-800">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">
            Nenhum pedido recente.
          </p>
        )}
      </div>
    </div>
  );
}
