"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, ShoppingCart, Package, Download } from "lucide-react";

interface FinanceData {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  topProducts: { title: string; salesCount: number; revenue: number }[];
}

export default function AdminFinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/admin/finance?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }

  async function exportCSV() {
    const params = new URLSearchParams({ startDate, endDate, format: "csv" });
    const res = await fetch(`/api/admin/finance?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" /></div>;
  }

  const stats = [
    { label: "Faturamento Total", value: formatCurrency(data?.totalRevenue || 0), icon: DollarSign, color: "bg-pink-100 text-pink-600" },
    { label: "Total de Pedidos", value: data?.totalOrders || 0, icon: ShoppingCart, color: "bg-blue-100 text-blue-600" },
    { label: "Ticket Médio", value: formatCurrency(data?.averageTicket || 0), icon: TrendingUp, color: "bg-green-100 text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Data inicial</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Data final</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${stat.color}`}><Icon className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Products */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Produtos Mais Vendidos</h2>
        {data?.topProducts && data.topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="pb-3 font-medium text-gray-500">#</th>
                  <th className="pb-3 font-medium text-gray-500">Produto</th>
                  <th className="pb-3 font-medium text-gray-500">Vendas</th>
                  <th className="pb-3 font-medium text-gray-500">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-gray-500">{i + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{p.title}</td>
                    <td className="py-3 text-gray-600">{p.salesCount}</td>
                    <td className="py-3 font-medium text-gray-800">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">Nenhum dado disponível para o período selecionado.</p>
        )}
      </div>
    </div>
  );
}
