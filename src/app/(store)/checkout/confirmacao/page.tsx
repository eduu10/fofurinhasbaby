"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  QrCode,
  CreditCard,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface PixData {
  qrCodeImage: string;
  qrCodePayload: string;
  expirationDate: string;
}

interface BoletoData {
  bankSlipUrl: string;
}

interface PaymentStatusData {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
}

function ConfirmacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const orderId = searchParams.get("orderId") || "";
  const method = searchParams.get("method") || "";

  const [pixData, setPixData] = useState<PixData | null>(null);
  const [boletoData, setBoletoData] = useState<BoletoData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData | null>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!orderId) {
      router.push("/account/orders");
      return;
    }

    // Load PIX/boleto data from sessionStorage
    if (method === "pix") {
      const stored = sessionStorage.getItem(`pix_${orderId}`);
      if (stored) {
        setPixData(JSON.parse(stored));
        sessionStorage.removeItem(`pix_${orderId}`);
      }
    }
    if (method === "boleto") {
      const stored = sessionStorage.getItem(`boleto_${orderId}`);
      if (stored) {
        setBoletoData(JSON.parse(stored));
        sessionStorage.removeItem(`boleto_${orderId}`);
      }
    }

    // Initial status check
    checkStatus();
  }, [orderId, method, user, router]);

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/checkout/status?orderId=${orderId}`);
      const json = await res.json();
      if (json.success) {
        setPaymentStatus(json.data);
        // Stop polling if payment is confirmed
        if (
          json.data.paymentStatus === "RECEIVED" ||
          json.data.paymentStatus === "CONFIRMED" ||
          json.data.status === "PAID"
        ) {
          setPolling(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, [orderId]);

  // Poll for status updates (PIX and boleto)
  useEffect(() => {
    if (!polling || method === "credit_card") return;

    const interval = setInterval(checkStatus, 5000);
    // Stop polling after 30 minutes
    const timeout = setTimeout(() => {
      setPolling(false);
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, method, checkStatus]);

  function copyPixCode() {
    if (!pixData?.qrCodePayload) return;
    navigator.clipboard.writeText(pixData.qrCodePayload);
    setCopied(true);
    toast.success("Codigo PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  }

  const isPaid =
    paymentStatus?.paymentStatus === "RECEIVED" ||
    paymentStatus?.paymentStatus === "CONFIRMED" ||
    paymentStatus?.status === "PAID";

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Success/Pending Header */}
      <div className="mb-8 text-center">
        {isPaid ? (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-green-700">
              Pagamento Confirmado!
            </h1>
            <p className="mt-2 text-gray-600">
              Seu pedido #{paymentStatus?.orderNumber} foi aprovado com sucesso.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <Clock size={40} className="text-amber-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-800">
              {method === "pix"
                ? "Aguardando Pagamento PIX"
                : method === "boleto"
                  ? "Boleto Gerado"
                  : "Processando Pagamento"}
            </h1>
            <p className="mt-2 text-gray-600">
              Pedido #{paymentStatus?.orderNumber || "..."} criado com sucesso!
            </p>
          </>
        )}
      </div>

      {/* PIX Payment Section */}
      {method === "pix" && !isPaid && pixData && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <QrCode size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">Pague com PIX</h2>
          </div>

          {/* QR Code */}
          <div className="mx-auto mb-6 flex flex-col items-center">
            <div className="rounded-2xl border-2 border-green-200 bg-white p-4">
              <img
                src={`data:image/png;base64,${pixData.qrCodeImage}`}
                alt="QR Code PIX"
                className="h-52 w-52"
              />
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Escaneie o QR Code com o app do seu banco
            </p>
          </div>

          {/* PIX Copy-Paste */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Ou copie o codigo PIX:
            </p>
            <div className="flex gap-2">
              <div className="flex-1 overflow-hidden rounded-xl bg-gray-100 px-4 py-3">
                <p className="truncate text-xs font-mono text-gray-700">
                  {pixData.qrCodePayload}
                </p>
              </div>
              <button
                onClick={copyPixCode}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700"
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copiado
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expiration */}
          {pixData.expirationDate && (
            <p className="text-center text-xs text-gray-400">
              Valido ate:{" "}
              {new Date(pixData.expirationDate).toLocaleString("pt-BR")}
            </p>
          )}

          {/* Polling indicator */}
          {polling && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600">
              <Loader2 size={14} className="animate-spin" />
              Aguardando confirmacao do pagamento...
            </div>
          )}
        </div>
      )}

      {/* PIX Confirmed */}
      {method === "pix" && isPaid && (
        <div className="mb-8 rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-green-600" />
          <p className="text-lg font-bold text-green-700">PIX recebido!</p>
          <p className="text-sm text-green-600">
            Pagamento confirmado. Seu pedido sera processado em breve.
          </p>
        </div>
      )}

      {/* Boleto Section */}
      {method === "boleto" && !isPaid && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Boleto Bancario
            </h2>
          </div>

          <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">Importante</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-amber-700">
              <li>O boleto vence em 3 dias uteis</li>
              <li>
                Apos o pagamento, a confirmacao pode levar ate 2 dias uteis
              </li>
              <li>Nao pague apos o vencimento</li>
            </ul>
          </div>

          {boletoData?.bankSlipUrl && (
            <a
              href={boletoData.bankSlipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 px-6 py-4 font-bold text-white transition hover:bg-gray-900"
            >
              <ExternalLink size={18} />
              Abrir Boleto (PDF)
            </a>
          )}

          {polling && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600">
              <Loader2 size={14} className="animate-spin" />
              Aguardando confirmacao do pagamento...
            </div>
          )}
        </div>
      )}

      {/* Credit Card Result */}
      {method === "credit_card" && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Cartao de Credito
            </h2>
          </div>

          {isPaid ? (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-600" />
              <p className="text-lg font-bold text-green-700">
                Pagamento aprovado!
              </p>
              <p className="text-sm text-green-600">
                Seu pedido sera processado em breve.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <Clock size={24} className="mx-auto mb-2 text-amber-600" />
              <p className="font-bold text-amber-700">
                Pagamento em analise
              </p>
              <p className="text-sm text-amber-600">
                O pagamento esta sendo processado. Voce recebera um e-mail com a
                confirmacao.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Order Summary */}
      {paymentStatus && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Resumo do Pedido
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Numero do pedido</span>
              <span className="font-bold text-gray-800">
                #{paymentStatus.orderNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Forma de pagamento</span>
              <span className="font-medium text-gray-700">
                {method === "pix"
                  ? "PIX"
                  : method === "credit_card"
                    ? "Cartao de Credito"
                    : "Boleto Bancario"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span
                className={`font-bold ${
                  isPaid ? "text-green-600" : "text-amber-600"
                }`}
              >
                {isPaid ? "Pago" : "Aguardando pagamento"}
              </span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-accent-orange">
                {formatCurrency(paymentStatus.total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/account/orders/${orderId}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-baby-pink px-6 py-4 font-bold text-white transition hover:bg-pink-400"
        >
          <ShoppingBag size={18} />
          Acompanhar Pedido
        </Link>
        <Link
          href="/products"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-4 font-bold text-gray-700 transition hover:bg-gray-50"
        >
          Continuar Comprando
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutConfirmacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-pink-500" />
        </div>
      }
    >
      <ConfirmacaoContent />
    </Suspense>
  );
}
