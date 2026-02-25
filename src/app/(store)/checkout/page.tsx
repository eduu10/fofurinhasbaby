"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MapPin, CreditCard, Check, ShieldCheck, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

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

const steps = [
  { key: "address", label: "Endereco", icon: MapPin },
  { key: "payment", label: "Pagamento", icon: CreditCard },
  { key: "confirm", label: "Confirmar", icon: Check },
] as const;

type Step = (typeof steps)[number]["key"];

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, getSubtotal, shipping, discount, getTotal, clearCart } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("address");
  const [cpf, setCpf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
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
    } catch { /* ignore */ }
  }

  // ViaCEP auto-fill
  async function handleCepBlur() {
    const cleanCep = newAddress.zipCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch { /* ignore */ }
    finally { setCepLoading(false); }
  }

  // CPF validation
  function validateCpf(value: string): boolean {
    const cpfClean = value.replace(/\D/g, "");
    if (cpfClean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfClean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpfClean[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(cpfClean[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpfClean[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(cpfClean[10]);
  }

  function formatCpf(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }

  async function handleAddAddress() {
    if (!newAddress.street || !newAddress.number || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      toast.error("Preencha todos os campos obrigatorios do endereco");
      return;
    }
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
        setNewAddress({ label: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" });
        toast.success("Endereco adicionado!");
      }
    } catch {
      toast.error("Erro ao adicionar endereco");
    }
  }

  function goToStep(step: Step) {
    if (step === "payment" && !selectedAddress) {
      toast.error("Selecione um endereco de entrega");
      return;
    }
    if (step === "confirm" && !paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }
    setCurrentStep(step);
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      toast.error("Selecione um endereco de entrega");
      return;
    }
    if (cpf && !validateCpf(cpf)) {
      toast.error("CPF invalido");
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
          cpf: cpf.replace(/\D/g, ""),
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

  const currentStepIdx = steps.findIndex((s) => s.key === currentStep);
  const selectedAddr = addresses.find((a) => a.id === selectedAddress);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[
        { label: "Carrinho", href: "/cart" },
        { label: "Checkout" },
      ]} />

      <h1 className="mb-8 text-3xl font-display font-bold text-gray-800">
        Finalizar Compra
      </h1>

      {/* Stepper */}
      <div className="mb-8 flex items-center justify-center gap-0">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === currentStepIdx;
          const isDone = idx < currentStepIdx;
          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => idx <= currentStepIdx && goToStep(step.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  isActive
                    ? "bg-baby-pink text-white shadow-md"
                    : isDone
                      ? "bg-green-100 text-green-700 cursor-pointer"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? (
                  <Check size={16} />
                ) : (
                  <StepIcon size={16} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-1 ${idx < currentStepIdx ? "bg-green-300" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-6">
          {/* Step 1: Address */}
          {currentStep === "address" && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Endereco de Entrega
              </h2>

              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                        selectedAddress === addr.id
                          ? "border-baby-pink bg-pink-50"
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
                          <span className="text-xs font-semibold uppercase text-baby-pink">
                            {addr.label}
                          </span>
                        )}
                        <p className="text-sm text-gray-700">
                          {addr.street}, {addr.number}
                          {addr.complement ? ` - ${addr.complement}` : ""}
                        </p>
                        <p className="text-sm text-gray-500">
                          {addr.neighborhood}, {addr.city} - {addr.state}, {addr.zipCode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum endereco cadastrado.</p>
              )}

              <button
                onClick={() => setShowNewAddress(!showNewAddress)}
                className="mt-4 text-sm font-medium text-baby-pink hover:text-pink-400"
              >
                + Adicionar novo endereco
              </button>

              {showNewAddress && (
                <div className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Rotulo (ex: Casa)"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    />
                    <div className="relative">
                      <input
                        placeholder="CEP"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                        value={newAddress.zipCode}
                        onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                        onBlur={handleCepBlur}
                      />
                      {cepLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                    </div>
                  </div>
                  <input
                    placeholder="Rua *"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Numero *"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                      value={newAddress.number}
                      onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })}
                    />
                    <input
                      placeholder="Complemento"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                      value={newAddress.complement}
                      onChange={(e) => setNewAddress({ ...newAddress, complement: e.target.value })}
                    />
                  </div>
                  <input
                    placeholder="Bairro"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                    value={newAddress.neighborhood}
                    onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Cidade *"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    />
                    <input
                      placeholder="Estado (UF) *"
                      maxLength={2}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-baby-pink focus:outline-none"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <button
                    onClick={handleAddAddress}
                    className="rounded-xl bg-baby-pink px-6 py-2.5 text-sm font-bold text-white hover:bg-pink-400 transition-colors"
                  >
                    Salvar Endereco
                  </button>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => goToStep("payment")}
                  disabled={!selectedAddress}
                  className="bg-baby-pink text-white font-bold px-8 py-3 rounded-xl hover:bg-pink-400 transition-colors disabled:opacity-50"
                >
                  Continuar &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === "payment" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  Dados Pessoais
                </h2>
                <div className="max-w-sm">
                  <label className="mb-1 block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none ${
                      cpf && !validateCpf(cpf)
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-gray-300 focus:border-baby-pink focus:ring-2 focus:ring-pink-200"
                    }`}
                    maxLength={14}
                  />
                  {cpf && !validateCpf(cpf) && (
                    <p className="mt-1 text-xs text-red-500">CPF invalido</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  Forma de Pagamento
                </h2>
                <div className="space-y-3">
                  {[
                    { id: "pix", label: "PIX", desc: "Aprovacao instantanea - 5% de desconto", badge: "-5%" },
                    { id: "credit_card", label: "Cartao de Credito", desc: "Ate 12x sem juros", badge: "12x" },
                    { id: "boleto", label: "Boleto Bancario", desc: "Prazo de 1-3 dias uteis", badge: null },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                        paymentMethod === method.id
                          ? "border-baby-pink bg-pink-50"
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
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{method.label}</p>
                        <p className="text-sm text-gray-500">{method.desc}</p>
                      </div>
                      {method.badge && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                          {method.badge}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("address")}
                  className="text-gray-500 font-bold px-6 py-3 hover:text-gray-700 transition-colors"
                >
                  &larr; Voltar
                </button>
                <button
                  onClick={() => goToStep("confirm")}
                  className="bg-baby-pink text-white font-bold px-8 py-3 rounded-xl hover:bg-pink-400 transition-colors"
                >
                  Revisar Pedido &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === "confirm" && (
            <div className="space-y-6">
              {/* Address Summary */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">Endereco de Entrega</h2>
                  <button onClick={() => setCurrentStep("address")} className="text-sm text-baby-pink font-bold hover:text-pink-400">Alterar</button>
                </div>
                {selectedAddr && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm">
                    {selectedAddr.label && <p className="font-bold text-baby-pink text-xs uppercase">{selectedAddr.label}</p>}
                    <p className="text-gray-700">{selectedAddr.street}, {selectedAddr.number}{selectedAddr.complement ? ` - ${selectedAddr.complement}` : ""}</p>
                    <p className="text-gray-500">{selectedAddr.neighborhood}, {selectedAddr.city} - {selectedAddr.state}, {selectedAddr.zipCode}</p>
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">Pagamento</h2>
                  <button onClick={() => setCurrentStep("payment")} className="text-sm text-baby-pink font-bold hover:text-pink-400">Alterar</button>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                  {paymentMethod === "pix" ? "PIX" : paymentMethod === "credit_card" ? "Cartao de Credito" : "Boleto Bancario"}
                  {cpf && <span className="ml-2 text-gray-400">CPF: {cpf}</span>}
                </p>
              </div>

              {/* Items Summary */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">Itens do Pedido</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                        <Image
                          src={item.product.image}
                          alt={item.product.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 line-clamp-1">{item.product.title}</p>
                        {item.variation && <p className="text-xs text-gray-400">{item.variation.name}: {item.variation.value}</p>}
                        <p className="text-gray-500">Qtd: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-800">
                        {formatCurrency((item.variation?.price || item.product.price) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("payment")}
                  className="text-gray-500 font-bold px-6 py-3 hover:text-gray-700 transition-colors"
                >
                  &larr; Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <aside className="w-full lg:w-96">
          <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Resumo do Pedido
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({items.length} {items.length === 1 ? "item" : "itens"})</span>
                <span className="font-medium">{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frete</span>
                <span className="font-medium">
                  {shipping > 0 ? formatCurrency(shipping) : <span className="text-green-600 font-bold">Gratis</span>}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {paymentMethod === "pix" && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto PIX (5%)</span>
                  <span>-{formatCurrency(getSubtotal() * 0.05)}</span>
                </div>
              )}
            </div>

            <hr className="my-4" />

            <div className="flex justify-between text-lg font-bold text-gray-800">
              <span>Total</span>
              <span className="text-accent-orange">
                {formatCurrency(
                  paymentMethod === "pix"
                    ? getTotal() - getSubtotal() * 0.05
                    : getTotal()
                )}
              </span>
            </div>

            {currentStep === "confirm" && (
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="mt-6 w-full rounded-xl bg-gradient-buy py-4 text-base font-display font-bold text-white transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Processando...</>
                ) : (
                  <><Lock size={18} /> Confirmar Pedido</>
                )}
              </button>
            )}

            {/* Trust badges */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={14} className="text-green-500" />
              <span>Compra 100% segura e protegida</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
