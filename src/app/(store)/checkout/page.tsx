"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  MapPin,
  CreditCard,
  Check,
  ShieldCheck,
  Lock,
  Loader2,
  QrCode,
  FileText,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
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
  const { items, getSubtotal, shipping, discount, couponCode, getTotal, clearCart } =
    useCartStore();

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

  // Credit card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

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
          const defaultAddr = json.data.find(
            (a: { isDefault: boolean }) => a.isDefault
          );
          setSelectedAddress(defaultAddr?.id || json.data[0].id);
        }
      }
    } catch {
      /* ignore */
    }
  }

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
    } catch {
      /* ignore */
    } finally {
      setCepLoading(false);
    }
  }

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
    if (clean.length <= 9)
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }

  function formatCardNumber(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 16);
    return clean.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatCardExpiry(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }

  function detectCardBrand(number: string): string {
    const clean = number.replace(/\D/g, "");
    if (/^4/.test(clean)) return "Visa";
    if (/^5[1-5]/.test(clean)) return "Mastercard";
    if (/^(636368|438935|504175|451416|636297)/.test(clean) || /^(5067|4576|4011)/.test(clean)) return "Elo";
    if (/^3[47]/.test(clean)) return "Amex";
    if (/^(606282|3841)/.test(clean)) return "Hipercard";
    return "";
  }

  async function handleAddAddress() {
    if (
      !newAddress.street ||
      !newAddress.number ||
      !newAddress.city ||
      !newAddress.state ||
      !newAddress.zipCode
    ) {
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
        setNewAddress({
          label: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zipCode: "",
        });
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
    if (step === "confirm") {
      if (!paymentMethod) {
        toast.error("Selecione uma forma de pagamento");
        return;
      }
      if (!cpf || !validateCpf(cpf)) {
        toast.error("Informe um CPF valido");
        return;
      }
      if (paymentMethod === "credit_card") {
        const errors: Record<string, string> = {};
        const cleanNum = cardNumber.replace(/\D/g, "");
        if (cleanNum.length < 13) errors.number = "Numero do cartao invalido";
        if (!cardHolder.trim()) errors.holder = "Nome do titular obrigatorio";
        const [expMonth, expYear] = cardExpiry.split("/");
        if (
          !expMonth ||
          !expYear ||
          parseInt(expMonth) < 1 ||
          parseInt(expMonth) > 12
        ) {
          errors.expiry = "Data de validade invalida";
        }
        if (cardCvv.length < 3) errors.cvv = "CVV invalido";
        setCardErrors(errors);
        if (Object.keys(errors).length > 0) return;
      }
    }
    setCurrentStep(step);
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      toast.error("Selecione um endereco de entrega");
      return;
    }
    if (!cpf || !validateCpf(cpf)) {
      toast.error("CPF invalido");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        addressId: selectedAddress,
        paymentMethod,
        cpf: cpf.replace(/\D/g, ""),
        couponCode: couponCode || undefined,
        shipping,
        items: items.map((item) => ({
          productId: item.product.id,
          variationId: item.variation?.id,
          quantity: item.quantity,
        })),
      };

      if (paymentMethod === "credit_card") {
        const [expMonth, expYear] = cardExpiry.split("/");
        const selectedAddrData = addresses.find((a) => a.id === selectedAddress);

        payload.creditCard = {
          holderName: cardHolder,
          number: cardNumber.replace(/\D/g, ""),
          expiryMonth: expMonth,
          expiryYear: `20${expYear}`,
          ccv: cardCvv,
        };

        payload.creditCardHolderInfo = {
          name: cardHolder,
          email: user?.email,
          cpfCnpj: cpf.replace(/\D/g, ""),
          postalCode: selectedAddrData?.zipCode.replace(/\D/g, "") || "",
          addressNumber: selectedAddrData?.number || "",
          phone: user?.phone?.replace(/\D/g, "") || "",
        };

        if (installments > 1) {
          payload.installmentCount = installments;
        }
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        clearCart();

        const params = new URLSearchParams({
          orderId: json.data.orderId,
          method: paymentMethod,
        });

        if (json.data.pix) {
          sessionStorage.setItem(
            `pix_${json.data.orderId}`,
            JSON.stringify(json.data.pix)
          );
        }
        if (json.data.boleto) {
          sessionStorage.setItem(
            `boleto_${json.data.orderId}`,
            JSON.stringify(json.data.boleto)
          );
        }

        router.push(`/checkout/confirmacao?${params.toString()}`);
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

  const subtotalValue = getSubtotal();
  const pixDiscount = paymentMethod === "pix" ? subtotalValue * 0.05 : 0;
  const totalValue = paymentMethod === "pix" ? getTotal() - pixDiscount : getTotal();
  const installmentValue = installments > 1 ? totalValue / installments : 0;

  const maxInstallments = 12;
  const installmentOptions = Array.from(
    { length: maxInstallments },
    (_, i) => i + 1
  ).filter((n) => totalValue / n >= 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Carrinho", href: "/cart" },
          { label: "Checkout" },
        ]}
      />

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
                {isDone ? <Check size={16} /> : <StepIcon size={16} />}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-1 ${
                    idx < currentStepIdx ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-6">
          {/* ===== STEP 1: ADDRESS ===== */}
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
                          {addr.neighborhood}, {addr.city} - {addr.state},{" "}
                          {addr.zipCode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhum endereco cadastrado.
                </p>
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
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, label: e.target.value })
                      }
                    />
                    <div className="relative">
                      <input
                        placeholder="CEP"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                        value={newAddress.zipCode}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            zipCode: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 8),
                          })
                        }
                        onBlur={handleCepBlur}
                      />
                      {cepLoading && (
                        <Loader2
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                        />
                      )}
                    </div>
                  </div>
                  <input
                    placeholder="Rua *"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                    value={newAddress.street}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, street: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Numero *"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                      value={newAddress.number}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, number: e.target.value })
                      }
                    />
                    <input
                      placeholder="Complemento"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
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
                      placeholder="Cidade *"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-baby-pink focus:outline-none"
                      value={newAddress.city}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, city: e.target.value })
                      }
                    />
                    <input
                      placeholder="Estado (UF) *"
                      maxLength={2}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-baby-pink focus:outline-none"
                      value={newAddress.state}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          state: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                  <button
                    onClick={handleAddAddress}
                    className="rounded-xl bg-baby-pink px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pink-400"
                  >
                    Salvar Endereco
                  </button>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => goToStep("payment")}
                  disabled={!selectedAddress}
                  className="rounded-xl bg-baby-pink px-8 py-3 font-bold text-white transition-colors hover:bg-pink-400 disabled:opacity-50"
                >
                  Continuar &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 2: PAYMENT ===== */}
          {currentStep === "payment" && (
            <div className="space-y-6">
              {/* CPF */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  Dados Pessoais
                </h2>
                <div className="max-w-sm">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    CPF *
                  </label>
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

              {/* Payment Method Selection */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  Forma de Pagamento
                </h2>
                <div className="space-y-3">
                  {/* PIX */}
                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                      paymentMethod === "pix"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="pix"
                      checked={paymentMethod === "pix"}
                      onChange={() => setPaymentMethod("pix")}
                      className="accent-green-600"
                    />
                    <QrCode
                      size={24}
                      className={
                        paymentMethod === "pix"
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">PIX</p>
                      <p className="text-sm text-gray-500">
                        Aprovacao instantanea
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      -5%
                    </span>
                  </label>

                  {/* Credit Card */}
                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                      paymentMethod === "credit_card"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="credit_card"
                      checked={paymentMethod === "credit_card"}
                      onChange={() => setPaymentMethod("credit_card")}
                      className="accent-blue-600"
                    />
                    <CreditCard
                      size={24}
                      className={
                        paymentMethod === "credit_card"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        Cartao de Credito
                      </p>
                      <p className="text-sm text-gray-500">Ate 12x sem juros</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      12x
                    </span>
                  </label>

                  {/* Boleto */}
                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                      paymentMethod === "boleto"
                        ? "border-gray-500 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="boleto"
                      checked={paymentMethod === "boleto"}
                      onChange={() => setPaymentMethod("boleto")}
                      className="accent-gray-600"
                    />
                    <FileText
                      size={24}
                      className={
                        paymentMethod === "boleto"
                          ? "text-gray-600"
                          : "text-gray-400"
                      }
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        Boleto Bancario
                      </p>
                      <p className="text-sm text-gray-500">
                        Prazo de 1-3 dias uteis
                      </p>
                    </div>
                  </label>
                </div>

                {/* Credit Card Form (transparent checkout) */}
                {paymentMethod === "credit_card" && (
                  <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Lock size={16} className="text-blue-600" />
                      <h3 className="text-sm font-bold text-blue-800">
                        Dados do Cartao
                      </h3>
                      {detectCardBrand(cardNumber) && (
                        <span className="ml-auto rounded-full bg-white px-3 py-0.5 text-xs font-bold text-blue-600 shadow-sm">
                          {detectCardBrand(cardNumber)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Numero do cartao
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={(e) =>
                            setCardNumber(formatCardNumber(e.target.value))
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm tracking-wider transition focus:outline-none ${
                            cardErrors.number
                              ? "border-red-300 focus:border-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          }`}
                          maxLength={19}
                        />
                        {cardErrors.number && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle size={12} /> {cardErrors.number}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Nome impresso no cartao
                        </label>
                        <input
                          type="text"
                          placeholder="NOME COMPLETO"
                          value={cardHolder}
                          onChange={(e) =>
                            setCardHolder(e.target.value.toUpperCase())
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm uppercase transition focus:outline-none ${
                            cardErrors.holder
                              ? "border-red-300 focus:border-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          }`}
                        />
                        {cardErrors.holder && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle size={12} /> {cardErrors.holder}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Validade
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="MM/AA"
                            value={cardExpiry}
                            onChange={(e) =>
                              setCardExpiry(formatCardExpiry(e.target.value))
                            }
                            className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none ${
                              cardErrors.expiry
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            }`}
                            maxLength={5}
                          />
                          {cardErrors.expiry && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                              <AlertCircle size={12} /> {cardErrors.expiry}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            CVV
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="000"
                            value={cardCvv}
                            onChange={(e) =>
                              setCardCvv(
                                e.target.value.replace(/\D/g, "").slice(0, 4)
                              )
                            }
                            className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none ${
                              cardErrors.cvv
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            }`}
                            maxLength={4}
                          />
                          {cardErrors.cvv && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                              <AlertCircle size={12} /> {cardErrors.cvv}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Parcelas
                        </label>
                        <div className="relative">
                          <select
                            value={installments}
                            onChange={(e) =>
                              setInstallments(parseInt(e.target.value))
                            }
                            className="w-full appearance-none rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            {installmentOptions.map((n) => (
                              <option key={n} value={n}>
                                {n === 1
                                  ? `1x de ${formatCurrency(totalValue)} (a vista)`
                                  : `${n}x de ${formatCurrency(totalValue / n)} sem juros`}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                      <ShieldCheck size={14} className="text-green-500" />
                      Seus dados sao criptografados e processados com seguranca
                    </div>
                  </div>
                )}

                {paymentMethod === "pix" && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <QrCode size={20} className="mt-0.5 text-green-600" />
                      <div className="text-sm text-green-800">
                        <p className="font-bold">Como funciona o PIX</p>
                        <p className="mt-1 text-green-700">
                          Apos confirmar o pedido, um QR Code sera gerado para
                          voce pagar. O pagamento e confirmado na hora!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "boleto" && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <FileText size={20} className="mt-0.5 text-gray-600" />
                      <div className="text-sm text-gray-700">
                        <p className="font-bold">Boleto Bancario</p>
                        <p className="mt-1">
                          O boleto tem vencimento em 3 dias uteis. Apos o
                          pagamento, a confirmacao pode levar ate 2 dias uteis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("address")}
                  className="px-6 py-3 font-bold text-gray-500 transition-colors hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
                <button
                  onClick={() => goToStep("confirm")}
                  className="rounded-xl bg-baby-pink px-8 py-3 font-bold text-white transition-colors hover:bg-pink-400"
                >
                  Revisar Pedido &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3: CONFIRM ===== */}
          {currentStep === "confirm" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Endereco de Entrega
                  </h2>
                  <button
                    onClick={() => setCurrentStep("address")}
                    className="text-sm font-bold text-baby-pink hover:text-pink-400"
                  >
                    Alterar
                  </button>
                </div>
                {selectedAddr && (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    {selectedAddr.label && (
                      <p className="text-xs font-bold uppercase text-baby-pink">
                        {selectedAddr.label}
                      </p>
                    )}
                    <p className="text-gray-700">
                      {selectedAddr.street}, {selectedAddr.number}
                      {selectedAddr.complement
                        ? ` - ${selectedAddr.complement}`
                        : ""}
                    </p>
                    <p className="text-gray-500">
                      {selectedAddr.neighborhood}, {selectedAddr.city} -{" "}
                      {selectedAddr.state}, {selectedAddr.zipCode}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Pagamento
                  </h2>
                  <button
                    onClick={() => setCurrentStep("payment")}
                    className="text-sm font-bold text-baby-pink hover:text-pink-400"
                  >
                    Alterar
                  </button>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    {paymentMethod === "pix" && (
                      <>
                        <QrCode size={16} className="text-green-600" />
                        <span className="font-medium">PIX</span>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          -5%
                        </span>
                      </>
                    )}
                    {paymentMethod === "credit_card" && (
                      <>
                        <CreditCard size={16} className="text-blue-600" />
                        <span className="font-medium">
                          Cartao ****{" "}
                          {cardNumber.replace(/\D/g, "").slice(-4)}
                        </span>
                        {detectCardBrand(cardNumber) && (
                          <span className="text-xs text-gray-500">
                            ({detectCardBrand(cardNumber)})
                          </span>
                        )}
                        {installments > 1 && (
                          <span className="text-xs text-gray-500">
                            {installments}x de{" "}
                            {formatCurrency(installmentValue)}
                          </span>
                        )}
                      </>
                    )}
                    {paymentMethod === "boleto" && (
                      <>
                        <FileText size={16} className="text-gray-600" />
                        <span className="font-medium">Boleto Bancario</span>
                      </>
                    )}
                  </div>
                  {cpf && (
                    <p className="mt-1 text-xs text-gray-400">CPF: {cpf}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  Itens do Pedido
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
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
                        <p className="line-clamp-1 font-medium text-gray-800">
                          {item.product.title}
                        </p>
                        {item.variation && (
                          <p className="text-xs text-gray-400">
                            {item.variation.name}: {item.variation.value}
                          </p>
                        )}
                        <p className="text-gray-500">Qtd: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-800">
                        {formatCurrency(
                          (item.variation?.price || item.product.price) *
                            item.quantity
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("payment")}
                  className="px-6 py-3 font-bold text-gray-500 transition-colors hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== ORDER SUMMARY SIDEBAR ===== */}
        <aside className="w-full lg:w-96">
          <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Resumo do Pedido
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal ({items.length}{" "}
                  {items.length === 1 ? "item" : "itens"})
                </span>
                <span className="font-medium">
                  {formatCurrency(subtotalValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frete</span>
                <span className="font-medium">
                  {shipping > 0 ? (
                    formatCurrency(shipping)
                  ) : (
                    <span className="font-bold text-green-600">Gratis</span>
                  )}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto cupom</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {paymentMethod === "pix" && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto PIX (5%)</span>
                  <span>-{formatCurrency(pixDiscount)}</span>
                </div>
              )}
              {paymentMethod === "credit_card" && installments > 1 && (
                <div className="flex justify-between text-blue-600">
                  <span>Parcelamento</span>
                  <span>
                    {installments}x de {formatCurrency(installmentValue)}
                  </span>
                </div>
              )}
            </div>

            <hr className="my-4" />

            <div className="flex justify-between text-lg font-bold text-gray-800">
              <span>Total</span>
              <span className="text-accent-orange">
                {formatCurrency(totalValue)}
              </span>
            </div>

            {currentStep === "confirm" && (
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-buy py-4 text-base font-display font-bold text-white transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Processando
                    pagamento...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    {paymentMethod === "pix"
                      ? "Gerar PIX"
                      : paymentMethod === "boleto"
                        ? "Gerar Boleto"
                        : "Pagar com Cartao"}
                  </>
                )}
              </button>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <ShieldCheck size={14} className="text-green-500" />
                <span>Compra 100% segura e protegida</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock size={12} />
                <span>Dados criptografados - Asaas</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
