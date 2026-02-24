"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, getSubtotal, shipping, discount, getTotal, clearCart } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (items.length === 0) {
      router.push("/cart");
      return;
    }
    fetchAddresses();
  }, [user, items.length, router]);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/user/addresses");
      const json = await res.json();
      if (json.success) {
        setAddresses(json.data);
        if (json.data.length > 0) {
          const defaultAddr = json.data.find((a: { isDefault: boolean }) => a.isDefault);
          setSelectedAddress(defaultAddr?.id || json.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleAddAddress() {
    try {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      const json = await res.json();
      if (json.success) {
        setAddresses([...addresses, json.data]);
        setSelectedAddress(json.data.id);
        setShowNewAddress(false);
        toast.success("Endereço adicionado!");
      }
    } catch {
      toast.error("Erro ao adicionar endereço");
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      toast.error("Selecione um endereço de entrega");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddress,
          paymentMethod,
          items: items.map((item) => ({
            productId: item.product.id,
            variationId: item.variation?.id,
            quantity: item.quantity,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        clearCart();
        toast.success("Pedido realizado com sucesso!");
        router.push(`/account/orders/${json.data.id}`);
      } else {
        toast.error(json.error || "Erro ao finalizar pedido");
      }
    } catch {
      toast.error("Erro ao processar pedido");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">
        Finalizar Compra
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-6">
          {/* Address */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Endereço de Entrega
            </h2>

            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                      selectedAddress === addr.id
                        ? "border-pink-600 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)}
                      className="mt-1 accent-pink-600"
                    />
                    <div>
                      {addr.label && (
                        <span className="text-xs font-semibold uppercase text-pink-600">
                          {addr.label}
                        </span>
                      )}
                      <p className="text-sm text-gray-700">
                        {addr.street}, {addr.number}
                        {addr.complement ? ` - ${addr.complement}` : ""}
                      </p>
                      <p className="text-sm text-gray-500">
                        {addr.neighborhood}, {addr.city} - {addr.state},{" "}
                        {addr.zipCode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Nenhum endereço cadastrado.
              </p>
            )}

            <button
              onClick={() => setShowNewAddress(!showNewAddress)}
              className="mt-4 text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              + Adicionar novo endereço
            </button>

            {showNewAddress && (
              <div className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Rótulo (ex: Casa)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={newAddress.label}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, label: e.target.value })
                    }
                  />
                  <input
                    placeholder="CEP"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={newAddress.zipCode}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, zipCode: e.target.value })
                    }
                  />
                </div>
                <input
                  placeholder="Rua"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={newAddress.street}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, street: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Número"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={newAddress.number}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, number: e.target.value })
                    }
                  />
                  <input
                    placeholder="Complemento"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={newAddress.complement}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        complement: e.target.value,
                      })
                    }
                  />
                </div>
                <input
                  placeholder="Bairro"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={newAddress.neighborhood}
                  onChange={(e) =>
                    setNewAddress({
                      ...newAddress,
                      neighborhood: e.target.value,
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Cidade"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                  />
                  <input
                    placeholder="Estado"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={newAddress.state}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, state: e.target.value })
                    }
                  />
                </div>
                <button
                  onClick={handleAddAddress}
                  className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
                >
                  Salvar Endereço
                </button>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Forma de Pagamento
            </h2>
            <div className="space-y-3">
              {[
                { id: "pix", label: "PIX", desc: "Aprovação instantânea" },
                {
                  id: "credit_card",
                  label: "Cartão de Crédito",
                  desc: "Até 12x sem juros",
                },
                {
                  id: "boleto",
                  label: "Boleto Bancário",
                  desc: "Prazo de 1-3 dias úteis",
                },
              ].map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                    paymentMethod === method.id
                      ? "border-pink-600 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="accent-pink-600"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{method.label}</p>
                    <p className="text-sm text-gray-500">{method.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <aside className="w-full lg:w-96">
          <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Resumo do Pedido
            </h2>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 line-clamp-1">
                      {item.product.title}
                    </p>
                    <p className="text-gray-500">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-800">
                    {formatCurrency(
                      (item.variation?.price || item.product.price) *
                        item.quantity
                    )}
                  </p>
                </div>
              ))}
            </div>

            <hr className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(getSubtotal())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frete</span>
                <span className="font-medium">
                  {shipping > 0 ? formatCurrency(shipping) : "Grátis"}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
            </div>

            <hr className="my-4" />

            <div className="flex justify-between text-lg font-bold text-gray-800">
              <span>Total</span>
              <span>{formatCurrency(getTotal())}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddress}
              className="mt-6 w-full rounded-full bg-pink-600 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
            >
              {loading ? "Processando..." : "Confirmar Pedido"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
