import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/aliexpress/callback
 *
 * Callback URL for AliExpress OAuth authorization.
 * Receives the authorization code, exchanges it for an access token
 * using the AliExpress REST API (/rest/auth/token/create),
 * and persists the tokens in the database (StoreSetting).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(
      renderHTML(
        "Erro na Autorização",
        "Código de autorização não encontrado. Tente autorizar novamente pelo painel do AliExpress.",
        true,
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;

  if (!appKey || !appSecret) {
    return new NextResponse(
      renderHTML(
        "Configuração Ausente",
        "ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET não estão configurados no servidor.",
        true,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  try {
    // Replicate exactly what ae_sdk does for /auth/token/create
    const apiPath = "/auth/token/create";

    // These are the params ae_sdk sends (including method for signing)
    const allParams: Record<string, string> = {
      method: apiPath,
      session: "",
      app_key: appKey,
      simplify: "true",
      sign_method: "sha256",
      timestamp: Date.now().toString(),
      code,
    };

    // Generate signature: for OP API (method contains "/"),
    // basestring = method + sorted remaining params
    const signParams = { ...allParams };
    let basestring = signParams.method;
    delete signParams.method;

    basestring += Object.entries(signParams)
      .filter(([, value]) => value != null)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [key, value]) => acc + key + String(value), "");

    const sign = crypto
      .createHmac("sha256", appSecret)
      .update(basestring, "utf-8")
      .digest("hex")
      .toUpperCase();

    // Build URL: for OP API, method is in the path, not in query params
    const queryParams = { ...allParams };
    delete queryParams.method;
    queryParams.sign = sign;

    const qs = Object.entries(queryParams)
      .filter(([, value]) => value != null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join("&");

    const apiUrl = `https://api-sg.aliexpress.com/rest${apiPath}?${qs}`;

    const res = await fetch(apiUrl, { method: "POST" });
    const json = await res.json();

    const access_token = String(json.access_token || "");
    const refresh_token = String(json.refresh_token || "");
    const expire_time = String(json.expire_time || "");
    const refresh_token_valid_time = String(json.refresh_token_valid_time || "");
    const seller_id = String(json.user_id || json.seller_id || "");
    const user_nick = String(json.user_nick || "");

    if (!access_token) {
      const debugInfo = JSON.stringify(json, null, 2);
      return new NextResponse(
        renderHTML(
          "Token Não Recebido",
          `A autorização foi aceita mas o AliExpress não retornou um access_token. Dados recebidos:<br><pre style="text-align:left;background:#f1f5f9;padding:12px;border-radius:8px;font-size:12px;overflow:auto;max-height:300px;">${debugInfo}</pre>`,
          true,
        ),
        { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Persist tokens in StoreSetting (upsert each key)
    const settings: Record<string, string> = {
      aliexpress_access_token: access_token,
      aliexpress_refresh_token: refresh_token,
      aliexpress_token_expire: expire_time,
      aliexpress_refresh_expire: refresh_token_valid_time,
      aliexpress_seller_id: seller_id,
      aliexpress_user_nick: user_nick,
    };

    const entries = Object.entries(settings).filter(([, v]) => v !== "" && v !== "undefined");

    await Promise.all(
      entries.map(([key, value]) =>
        prisma.storeSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    return new NextResponse(
      renderHTML(
        "Autorização Concluída!",
        `Sua conta AliExpress (${user_nick || seller_id || "seller"}) foi conectada com sucesso. O access_token foi salvo. Você já pode fechar esta página e testar a conexão no painel admin.`,
        false,
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      renderHTML(
        "Erro Inesperado",
        `Ocorreu um erro ao processar a autorização: ${message}`,
        true,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

// ---------------------------------------------------------------------------
// Minimal HTML renderer for feedback pages
// ---------------------------------------------------------------------------

function renderHTML(title: string, message: string, isError: boolean): string {
  const color = isError ? "#e11d48" : "#16a34a";
  const icon = isError ? "&#10060;" : "&#9989;";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - Fofurinhas Baby</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fdf2f8; }
    .card { background: #fff; border-radius: 12px; padding: 2rem; max-width: 480px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { color: ${color}; font-size: 1.5rem; margin: 0 0 .75rem; }
    p { color: #334155; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
