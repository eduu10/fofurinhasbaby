"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";

interface Settings {
  storeName: string;
  storeLogo: string;
  primaryColor: string;
  currency: string;
  defaultMargin: string;
  shippingFee: string;
  freeShippingMin: string;
}

const defaultSettings: Settings = {
  storeName: "Fofurinhas Baby",
  storeLogo: "",
  primaryColor: "#db2777",
  currency: "BRL",
  defaultMargin: "40",
  shippingFee: "19.90",
  freeShippingMin: "199",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings({ ...defaultSettings, ...json.data });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Configurações salvas!");
      } else {
        toast.error(json.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>

      {/* Store Info */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Informações da Loja</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome da Loja</label>
            <input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">URL do Logo</label>
            <input value={settings.storeLogo} onChange={(e) => setSettings({ ...settings, storeLogo: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cor Primária</label>
            <div className="flex gap-2">
              <input type="color" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} className="h-11 w-11 cursor-pointer rounded-lg border border-gray-300" />
              <input value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Moeda</label>
            <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none">
              <option value="BRL">BRL - Real Brasileiro</option>
              <option value="USD">USD - Dólar Americano</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dropshipping */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Dropshipping / Margem</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Margem padrão (%)</label>
            <input type="number" value={settings.defaultMargin} onChange={(e) => setSettings({ ...settings, defaultMargin: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
            <p className="mt-1 text-xs text-gray-400">Margem aplicada ao importar produtos do AliExpress</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Taxa de frete (R$)</label>
            <input type="number" step="0.01" value={settings.shippingFee} onChange={(e) => setSettings({ ...settings, shippingFee: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frete grátis acima de (R$)</label>
            <input type="number" step="0.01" value={settings.freeShippingMin} onChange={(e) => setSettings({ ...settings, freeShippingMin: e.target.value })} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </button>
    </div>
  );
}
