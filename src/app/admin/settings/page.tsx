"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Store, Layout, ImageIcon, Phone, Truck, Upload, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const tabs = [
  { id: "store", label: "Loja", icon: Store },
  { id: "header", label: "Header & Topo", icon: Layout },
  { id: "hero", label: "Hero / Banner", icon: ImageIcon },
  { id: "contact", label: "Contato & Redes", icon: Phone },
  { id: "shipping", label: "Dropshipping", icon: Truck },
];

const defaultSettings: Record<string, string> = {
  storeName: "Fofurinhas Baby",
  storeLogo: "",
  primaryColor: "#db2777",
  currency: "BRL",
  topBarText: "FRETE GRATIS PARA TODO O BRASIL",
  searchPlaceholder: "O que seu bebe precisa hoje?",
  heroBadge: "✨ Novidade Magica",
  heroTitle1: "Sonhos Doces &",
  heroTitle2: "Noites Tranquilas",
  heroDescription: "Descubra nossa colecao exclusiva de produtos que transformam o dia a dia do seu bebe em momentos magicos.",
  heroCta1: "VER OFERTAS",
  heroCta2: "MAIS VENDIDOS",
  heroImage: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=75&w=650&fm=webp",
  heroTestimonial: "Meu bebe dormiu em 5 minutos!",
  heroTestimonialAuthor: "Mamae Julia",
  contactEmail: "contato@fofurinhasbaby.com.br",
  contactWhatsapp: "5511999999999",
  contactWhatsappDisplay: "(11) 99999-9999",
  contactHours: "Seg a Sex, 9h as 18h",
  socialInstagram: "",
  socialFacebook: "",
  socialTiktok: "",
  defaultMargin: "40",
  shippingFee: "19.90",
  freeShippingMin: "199",
};

function InputField({ label, value, onChange, type = "text", placeholder, hint }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function TextareaField({ label, value, onChange, hint, rows = 3 }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ImageUploadField({ label, value, onChange, hint }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        onChange(json.url);
        toast.success("Imagem enviada!");
      } else {
        toast.error(json.error || "Erro no upload");
      }
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>

      {/* Preview + upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-4 text-center transition ${
          dragOver ? "border-pink-400 bg-pink-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="Preview"
              className="mx-auto h-32 rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="py-4">
            {uploading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-500" />
            ) : (
              <>
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Arraste uma imagem ou{" "}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="font-semibold text-pink-600 hover:text-pink-700"
                  >
                    clique para selecionar
                  </button>
                </p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP ou GIF (max 5MB)</p>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* URL manual input */}
      <div className="mt-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ou cole a URL da imagem aqui..."
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-pink-600 hover:text-pink-700 disabled:opacity-50"
        >
          <Upload className="h-3 w-3" />
          Trocar imagem
        </button>
      )}

      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("store");

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

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

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
        toast.success("Configuracoes salvas!");
      } else {
        toast.error(json.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar configuracoes");
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configuracoes</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {/* Loja */}
        {activeTab === "store" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Informacoes da Loja</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Nome da Loja" value={settings.storeName} onChange={(v) => update("storeName", v)} />
              <ImageUploadField label="Logo da Loja" value={settings.storeLogo} onChange={(v) => update("storeLogo", v)} hint="Logo exibido no header do site" />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cor Primaria</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="h-11 w-11 cursor-pointer rounded-lg border border-gray-300"
                  />
                  <input
                    value={settings.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Moeda</label>
                <select
                  value={settings.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none"
                >
                  <option value="BRL">BRL - Real Brasileiro</option>
                  <option value="USD">USD - Dolar Americano</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Header & Topo */}
        {activeTab === "header" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Header & Barra de Topo</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Texto da barra de topo"
                value={settings.topBarText}
                onChange={(v) => update("topBarText", v)}
                hint="Texto que aparece na faixa azul no topo do site"
              />
              <InputField
                label="Placeholder da busca"
                value={settings.searchPlaceholder}
                onChange={(v) => update("searchPlaceholder", v)}
                hint="Texto de placeholder no campo de busca"
              />
            </div>
          </div>
        )}

        {/* Hero / Banner */}
        {activeTab === "hero" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Hero / Banner Principal</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Badge de destaque"
                value={settings.heroBadge}
                onChange={(v) => update("heroBadge", v)}
                hint='Ex: ✨ Novidade Magica'
              />
              <ImageUploadField
                label="Imagem do banner"
                value={settings.heroImage}
                onChange={(v) => update("heroImage", v)}
                hint="Imagem principal do banner"
              />
              <InputField
                label="Titulo linha 1"
                value={settings.heroTitle1}
                onChange={(v) => update("heroTitle1", v)}
                hint="Primeira parte do titulo grande"
              />
              <InputField
                label="Titulo linha 2"
                value={settings.heroTitle2}
                onChange={(v) => update("heroTitle2", v)}
                hint="Segunda parte do titulo grande"
              />
              <div className="sm:col-span-2">
                <TextareaField
                  label="Descricao"
                  value={settings.heroDescription}
                  onChange={(v) => update("heroDescription", v)}
                  hint="Texto abaixo do titulo"
                />
              </div>
              <InputField
                label="Texto botao 1 (principal)"
                value={settings.heroCta1}
                onChange={(v) => update("heroCta1", v)}
              />
              <InputField
                label="Texto botao 2 (secundario)"
                value={settings.heroCta2}
                onChange={(v) => update("heroCta2", v)}
              />
              <InputField
                label="Depoimento"
                value={settings.heroTestimonial}
                onChange={(v) => update("heroTestimonial", v)}
                hint="Texto do depoimento flutuante"
              />
              <InputField
                label="Autor do depoimento"
                value={settings.heroTestimonialAuthor}
                onChange={(v) => update("heroTestimonialAuthor", v)}
              />
            </div>

          </div>
        )}

        {/* Contato & Redes */}
        {activeTab === "contact" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Contato</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Email de contato"
                value={settings.contactEmail}
                onChange={(v) => update("contactEmail", v)}
                type="email"
              />
              <InputField
                label="Numero WhatsApp"
                value={settings.contactWhatsapp}
                onChange={(v) => update("contactWhatsapp", v)}
                hint="Apenas numeros com codigo do pais (ex: 5511999999999)"
              />
              <InputField
                label="WhatsApp exibicao"
                value={settings.contactWhatsappDisplay}
                onChange={(v) => update("contactWhatsappDisplay", v)}
                hint="Como o numero aparece no site (ex: (11) 99999-9999)"
              />
              <InputField
                label="Horario de atendimento"
                value={settings.contactHours}
                onChange={(v) => update("contactHours", v)}
              />
            </div>

            <h2 className="mb-4 mt-8 text-lg font-semibold text-gray-800">Redes Sociais</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                label="Instagram"
                value={settings.socialInstagram}
                onChange={(v) => update("socialInstagram", v)}
                placeholder="https://instagram.com/..."
              />
              <InputField
                label="Facebook"
                value={settings.socialFacebook}
                onChange={(v) => update("socialFacebook", v)}
                placeholder="https://facebook.com/..."
              />
              <InputField
                label="TikTok"
                value={settings.socialTiktok}
                onChange={(v) => update("socialTiktok", v)}
                placeholder="https://tiktok.com/..."
              />
            </div>
          </div>
        )}

        {/* Dropshipping */}
        {activeTab === "shipping" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Dropshipping / Margem</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                label="Margem padrao (%)"
                value={settings.defaultMargin}
                onChange={(v) => update("defaultMargin", v)}
                type="number"
                hint="Margem aplicada ao importar produtos do AliExpress"
              />
              <InputField
                label="Taxa de frete (R$)"
                value={settings.shippingFee}
                onChange={(v) => update("shippingFee", v)}
                type="number"
              />
              <InputField
                label="Frete gratis acima de (R$)"
                value={settings.freeShippingMin}
                onChange={(v) => update("freeShippingMin", v)}
                type="number"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configuracoes"}
      </button>
    </div>
  );
}
