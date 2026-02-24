"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Trash2, Edit2, Plus } from "lucide-react";

interface Address {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    isDefault: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/user/addresses");
      const json = await res.json();
      if (json.success) setAddresses(json.data);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      label: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      isDefault: false,
    });
    setEditing(null);
    setShowForm(false);
  }

  async function handleSave() {
    const url = editing
      ? `/api/user/addresses/${editing}`
      : "/api/user/addresses";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Endereço atualizado!" : "Endereço adicionado!");
        fetchAddresses();
        resetForm();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Erro ao salvar endereço");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir este endereço?")) return;
    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Endereço removido!");
        setAddresses(addresses.filter((a) => a.id !== id));
      }
    } catch {
      toast.error("Erro ao remover endereço");
    }
  }

  function startEdit(addr: Address) {
    setForm({
      label: addr.label || "",
      street: addr.street,
      number: addr.number,
      complement: addr.complement || "",
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      isDefault: addr.isDefault,
    });
    setEditing(addr.id);
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Meus Endereços
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
        >
          <Plus className="h-4 w-4" />
          Novo Endereço
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 p-4">
          <h3 className="mb-4 font-medium text-gray-800">
            {editing ? "Editar Endereço" : "Novo Endereço"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Rótulo (ex: Casa)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <input
              placeholder="CEP"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.zipCode}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
            />
            <input
              placeholder="Rua"
              className="col-span-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
            <input
              placeholder="Número"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
            <input
              placeholder="Complemento"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.complement}
              onChange={(e) => setForm({ ...form, complement: e.target.value })}
            />
            <input
              placeholder="Bairro"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.neighborhood}
              onChange={(e) =>
                setForm({ ...form, neighborhood: e.target.value })
              }
            />
            <input
              placeholder="Cidade"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <input
              placeholder="Estado"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="accent-pink-600"
              />
              Endereço padrão
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
            >
              Salvar
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <p className="py-8 text-center text-gray-500">
          Nenhum endereço cadastrado.
        </p>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex items-start justify-between rounded-xl border border-gray-200 p-4"
            >
              <div>
                {addr.label && (
                  <span className="text-xs font-semibold uppercase text-pink-600">
                    {addr.label}
                  </span>
                )}
                {addr.isDefault && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    Padrão
                  </span>
                )}
                <p className="mt-1 text-sm text-gray-700">
                  {addr.street}, {addr.number}
                  {addr.complement ? ` - ${addr.complement}` : ""}
                </p>
                <p className="text-sm text-gray-500">
                  {addr.neighborhood}, {addr.city} - {addr.state},{" "}
                  {addr.zipCode}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(addr)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
