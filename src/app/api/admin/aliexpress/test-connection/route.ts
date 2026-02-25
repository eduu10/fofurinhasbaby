import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isAliExpressConfigured } from "@/lib/aliexpress";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const configured = isAliExpressConfigured();

  if (!configured) {
    return NextResponse.json({
      success: true,
      data: {
        configured: false,
        connected: false,
        message: "Variaveis de ambiente do AliExpress nao configuradas. Verifique ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET e ALIEXPRESS_ACCESS_TOKEN.",
      },
    });
  }

  try {
    // Try a simple API call to verify connection
    const { getHotProducts } = await import("@/lib/aliexpress");
    const result = await getHotProducts("baby", 1);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          configured: true,
          connected: true,
          message: `Conexao OK! ${result.length} produto(s) encontrado(s) no teste.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        connected: true,
        message: "API configurada mas nenhum produto de teste retornado. A conexao pode estar funcional.",
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        connected: false,
        message: `Erro ao testar conexao: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      },
    });
  }
}
