"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Wifi } from "lucide-react";
import toast from "react-hot-toast";

interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  message: string;
}

export default function AliExpressSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/aliexpress/test-connection");
      const json = await res.json();
      setStatus(json.data || { configured: false, connected: false, message: "Erro ao verificar" });
    } catch {
      setStatus({ configured: false, connected: false, message: "Erro de conexao" });
    } finally {
      setTesting(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/aliexpress/test-connection");
      const json = await res.json();
      if (json.success && json.data?.connected) {
        toast.success("Conexao com AliExpress OK!");
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configuracoes AliExpress</h1>

      {/* Connection Status */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Status da Conexao</h2>

        <div className="flex items-center gap-4 mb-6">
          {status ? (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              status.connected ? "bg-green-50" : "bg-red-50"
            }`}>
              {status.connected ? (
                <CheckCircle size={24} className="text-green-500" />
              ) : (
                <XCircle size={24} className="text-red-500" />
              )}
              <div>
                <p className={`font-bold ${status.connected ? "text-green-700" : "text-red-700"}`}>
                  {status.connected ? "Conectado" : "Desconectado"}
                </p>
                <p className="text-sm text-gray-500">{status.message}</p>
              </div>
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
          className="flex items-center gap-2 bg-baby-blue text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-400 transition-colors disabled:opacity-50"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
          Testar Conexao
        </button>
      </div>

      {/* Environment Variables Guide */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Variaveis de Ambiente</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure as seguintes variaveis no arquivo <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">.env</code> do seu projeto:
        </p>

        <div className="space-y-3">
          {[
            { key: "ALIEXPRESS_APP_KEY", desc: "Chave da aplicacao AliExpress", configured: !!status?.configured },
            { key: "ALIEXPRESS_APP_SECRET", desc: "Secret da aplicacao", configured: !!status?.configured },
            { key: "ALIEXPRESS_ACCESS_TOKEN", desc: "Token de acesso OAuth", configured: !!status?.configured },
            { key: "ALIEXPRESS_TRACKING_ID", desc: "ID de rastreamento de afiliado", configured: !!status?.configured },
          ].map((env) => (
            <div key={env.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <code className="text-sm font-mono font-bold text-gray-800">{env.key}</code>
                <p className="text-xs text-gray-500 mt-0.5">{env.desc}</p>
              </div>
              {env.configured ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Usage Guide */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Como Funciona</h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-baby-blue/10 rounded-full flex items-center justify-center text-baby-blue font-bold text-xs shrink-0">1</div>
            <div>
              <p className="font-bold text-gray-800">Importar Produtos</p>
              <p>Use a pagina de importacao para buscar e importar produtos do AliExpress para sua loja.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-baby-blue/10 rounded-full flex items-center justify-center text-baby-blue font-bold text-xs shrink-0">2</div>
            <div>
              <p className="font-bold text-gray-800">Pedido do Cliente</p>
              <p>Quando um cliente faz um pedido, voce recebe a notificacao normalmente.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-baby-blue/10 rounded-full flex items-center justify-center text-baby-blue font-bold text-xs shrink-0">3</div>
            <div>
              <p className="font-bold text-gray-800">Enviar para AliExpress</p>
              <p>Apos confirmacao do pagamento, clique em &quot;Enviar para AliExpress&quot; na pagina de pedidos para criar o pedido automaticamente.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-baby-blue/10 rounded-full flex items-center justify-center text-baby-blue font-bold text-xs shrink-0">4</div>
            <div>
              <p className="font-bold text-gray-800">Rastreamento Automatico</p>
              <p>O status do pedido e codigo de rastreio sao sincronizados automaticamente a cada 2 horas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
