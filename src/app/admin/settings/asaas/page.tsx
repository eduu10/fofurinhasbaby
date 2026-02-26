"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Wifi,
  CreditCard,
  QrCode,
  FileText,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  environment: string;
  message: string;
  keys: {
    apiKey: boolean;
    environment: boolean;
    webhookToken: boolean;
  };
}

export default function AsaasSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/asaas/test-connection");
      const json = await res.json();
      setStatus(
        json.data || {
          configured: false,
          connected: false,
          environment: "sandbox",
          message: "Erro ao verificar",
          keys: { apiKey: false, environment: false, webhookToken: false },
        }
      );
    } catch {
      setStatus({
        configured: false,
        connected: false,
        environment: "sandbox",
        message: "Erro de conexao",
        keys: { apiKey: false, environment: false, webhookToken: false },
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/asaas/test-connection");
      const json = await res.json();
      if (json.success && json.data?.connected) {
        toast.success("Conexao com Asaas OK!");
      } else {
        toast.error(json.data?.message || "Falha na conexao");
      }
      setStatus(json.data);
    } catch {
      toast.error("Erro ao testar conexao");
    } finally {
      setTesting(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copiado!");
    setTimeout(() => setCopied(""), 2000);
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/asaas`
      : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pagamentos - Asaas</h1>
        <a
          href="https://www.asaas.com/login"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Painel Asaas <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Connection Status */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Status da Conexao</h2>

        <div className="mb-6 flex items-center gap-4">
          {status ? (
            <div
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                status.connected ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {status.connected ? (
                <CheckCircle size={24} className="text-green-500" />
              ) : (
                <XCircle size={24} className="text-red-500" />
              )}
              <div>
                <p
                  className={`font-bold ${
                    status.connected ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {status.connected ? "Conectado" : "Desconectado"}
                </p>
                <p className="text-sm text-gray-500">{status.message}</p>
              </div>
              {status.environment && (
                <span
                  className={`ml-2 rounded-full px-3 py-1 text-xs font-bold ${
                    status.environment === "production"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {status.environment === "production" ? "Producao" : "Sandbox"}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              Verificando...
            </div>
          )}
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Wifi size={16} />
          )}
          Testar Conexao
        </button>
      </div>

      {/* Environment Variables */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-800">
          Variaveis de Ambiente
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Configure as seguintes variaveis no{" "}
          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
            .env
          </code>{" "}
          do projeto ou nas configuracoes da Vercel:
        </p>

        <div className="space-y-3">
          {[
            {
              key: "ASAAS_API_KEY",
              desc: "Chave de API do Asaas ($aact_...)",
              configured: status?.keys.apiKey,
              hint: "Obtida em: Asaas > Integracao > API",
            },
            {
              key: "ASAAS_ENVIRONMENT",
              desc: 'Ambiente: "sandbox" ou "production"',
              configured: status?.keys.environment,
              hint: 'Use "sandbox" para testes, "production" para cobrar de verdade',
            },
            {
              key: "ASAAS_WEBHOOK_TOKEN",
              desc: "Token para validacao de webhooks (opcional mas recomendado)",
              configured: status?.keys.webhookToken,
              hint: "Crie um token seguro e configure no painel Asaas",
            },
          ].map((env) => (
            <div
              key={env.key}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold text-gray-800">
                    {env.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(env.key, env.key)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copiar nome"
                  >
                    {copied === env.key ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{env.desc}</p>
                <p className="text-xs text-gray-400">{env.hint}</p>
              </div>
              {env.configured ? (
                <CheckCircle size={16} className="ml-3 text-green-500" />
              ) : (
                <XCircle size={16} className="ml-3 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Webhook URL */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-800">URL do Webhook</h2>
        <p className="mb-4 text-sm text-gray-600">
          Configure esta URL no painel do Asaas para receber notificacoes de pagamento
          automaticamente.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-gray-100 px-4 py-3">
            <code className="break-all text-sm font-mono text-gray-800">
              {webhookUrl || "https://seusite.com/api/webhooks/asaas"}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(webhookUrl, "webhook")}
            className="flex items-center gap-2 rounded-xl bg-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            {copied === "webhook" ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copiar
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Asaas &gt; Integracao &gt; Webhooks &gt; Adicionar &gt; Cole a URL acima
        </p>
      </div>

      {/* Payment Methods */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Metodos de Pagamento Disponiveis
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <QrCode className="mx-auto mb-2 h-8 w-8 text-green-600" />
            <p className="font-bold text-green-700">PIX</p>
            <p className="mt-1 text-xs text-green-600">
              QR Code instantaneo com 5% de desconto
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-blue-600" />
            <p className="font-bold text-blue-700">Cartao de Credito</p>
            <p className="mt-1 text-xs text-blue-600">
              Ate 12x - checkout transparente
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-600" />
            <p className="font-bold text-gray-700">Boleto</p>
            <p className="mt-1 text-xs text-gray-600">Vencimento em 3 dias uteis</p>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Guia de Configuracao
        </h2>
        <div className="space-y-4 text-sm text-gray-600">
          {[
            {
              step: 1,
              title: "Criar conta no Asaas",
              desc: 'Acesse asaas.com e crie sua conta. Inicie no modo sandbox para testar.',
            },
            {
              step: 2,
              title: "Gerar chave de API",
              desc: 'No painel Asaas, va em "Integracao" > "API" e gere uma nova chave.',
            },
            {
              step: 3,
              title: "Configurar variaveis de ambiente",
              desc: "Adicione ASAAS_API_KEY e ASAAS_ENVIRONMENT no .env ou na Vercel.",
            },
            {
              step: 4,
              title: "Configurar webhook",
              desc: "Copie a URL do webhook acima e configure no painel Asaas para receber notificacoes.",
            },
            {
              step: 5,
              title: "Testar no sandbox",
              desc: "Faca um pedido de teste para garantir que tudo funciona. Use o cartao 5162 3063 4242 4242.",
            },
            {
              step: 6,
              title: "Ativar producao",
              desc: 'Quando estiver tudo OK, altere ASAAS_ENVIRONMENT para "production" e use a API key de producao.',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-600">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-gray-800">{item.title}</p>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-bold">Seguranca</p>
          <p>
            A chave de API do Asaas nunca e exposta no frontend. Todas as
            transacoes sao processadas pelo servidor. Certifique-se de usar
            HTTPS em producao para proteger os dados do cartao.
          </p>
        </div>
      </div>
    </div>
  );
}
