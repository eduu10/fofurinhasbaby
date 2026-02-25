"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ImageOff,
  Database,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface DropshipMetrics {
  estimatedCostUSD: number;
  estimatedMarginBRL: number;
  marginPercent: number;
  productsOutOfStock: number;
  productsLowMargin: number;
  productsBrokenImage: number;
  topProducts: {
    id: string;
    title: string;
    marginPercent: number;
    salesCount: number;
    revenue: number;
  }[];
  apiUsage: { used: number; limit: number; percentage: number } | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [dropship, setDropship] = useState<DropshipMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar dados financeiros
    fetch("/api/admin/finance?period=30d")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));

    // Buscar métricas de dropshipping
    fetch("/api/admin/dropship-metrics")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDropship(json.data);
      })
      .catch(() => {});
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
      label: "Faturamento Bruto",
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
    PROCESSING: { label: "Processando", color: "bg-orange-100 text-orange-800" },
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
            <div key={stat.label} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rentabilidade Dropshipping */}
      {dropship && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-500">Margem Líquida Estimada</p>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {dropship.marginPercent.toFixed(0)}%
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Custo est.: {formatCurrency(dropship.estimatedCostUSD * 5.5)} |
              Lucro est.: {formatCurrency(dropship.estimatedMarginBRL)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-500">Uso da API Omkar</p>
            </div>
            {dropship.apiUsage ? (
              <>
                <p className="text-3xl font-bold text-gray-800">
                  {dropship.apiUsage.used}
                  <span className="text-lg text-gray-400">/{dropship.apiUsage.limit}</span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${dropship.apiUsage.percentage}%`,
                      background:
                        dropship.apiUsage.percentage >= 80
                          ? "#ef4444"
                          : dropship.apiUsage.percentage >= 50
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">API não configurada</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-500">Alertas de Produtos</p>
            </div>
            <div className="space-y-2">
              {dropship.productsOutOfStock > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-red-700">{dropship.productsOutOfStock} sem estoque</span>
                </div>
              )}
              {dropship.productsLowMargin > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700">{dropship.productsLowMargin} margem &lt; 30%</span>
                </div>
              )}
              {dropship.productsBrokenImage > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-gray-600">{dropship.productsBrokenImage} sem imagem</span>
                </div>
              )}
              {dropship.productsOutOfStock === 0 &&
                dropship.productsLowMargin === 0 &&
                dropship.productsBrokenImage === 0 && (
                  <p className="text-sm text-green-600">Tudo certo!</p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Orders + Alerts */}
      {(data?.pendingOrders || 0) > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            Você tem {data?.pendingOrders} pedido(s) pendente(s) aguardando ação.
          </p>
          <Link
            href="/admin/orders"
            className="ml-auto text-sm font-medium text-amber-700 hover:underline"
          >
            Ver pedidos
          </Link>
        </div>
      )}

      {/* Top Produtos por Margem */}
      {dropship?.topProducts && dropship.topProducts.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Top Produtos por Margem
            </h2>
            <Link
              href="/admin/products/import"
              className="flex items-center gap-1 text-sm text-pink-600 hover:underline"
            >
              <Search className="h-3.5 w-3.5" />
              Importar similares
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 font-medium text-gray-500">Produto</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Margem</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Vendas</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {dropship.topProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 max-w-xs">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-gray-800 hover:text-pink-600 line-clamp-1"
                      >
                        {product.title}
                      </Link>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          product.marginPercent >= 50
                            ? "text-green-600"
                            : product.marginPercent >= 30
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {product.marginPercent >= 50 ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        {product.marginPercent.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {product.salesCount}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-800">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Pedidos Recentes
          </h2>
          <Link
            href="/admin/orders"
            className="text-sm text-pink-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>

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
                  const s = statusLabels[order.status] || statusLabels.PENDING;
                  return (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-gray-800 hover:text-pink-600"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-600">{order.user.name}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}>
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
