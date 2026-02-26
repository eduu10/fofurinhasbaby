import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { isAsaasConfigured } from "@/lib/asaas";

export async function GET() {
  try {
    await requireAdmin();

    const apiKey = process.env.ASAAS_API_KEY || "";
    const environment = process.env.ASAAS_ENVIRONMENT || "sandbox";
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || "";

    if (!isAsaasConfigured()) {
      return successResponse({
        configured: false,
        connected: false,
        environment,
        message: "ASAAS_API_KEY nao configurada nas variaveis de ambiente",
        keys: {
          apiKey: false,
          environment: !!environment,
          webhookToken: !!webhookToken,
        },
      });
    }

    // Test connection by listing customers (limit 1)
    const baseUrl =
      environment === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3";

    const res = await fetch(`${baseUrl}/customers?limit=1`, {
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
    });

    if (res.ok) {
      return successResponse({
        configured: true,
        connected: true,
        environment,
        message: `Conectado ao Asaas (${environment})`,
        keys: {
          apiKey: true,
          environment: true,
          webhookToken: !!webhookToken,
        },
      });
    }

    const error = await res.json().catch(() => ({}));
    return successResponse({
      configured: true,
      connected: false,
      environment,
      message: error.errors?.[0]?.description || `Erro ${res.status}: Falha na conexao`,
      keys: {
        apiKey: true,
        environment: true,
        webhookToken: !!webhookToken,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Nao autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Asaas test connection error:", error);
    return errorResponse("Erro ao testar conexao", 500);
  }
}
