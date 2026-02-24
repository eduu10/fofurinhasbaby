import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const settings = await prisma.storeSetting.findMany();

    // Convert to key-value object for easier consumption
    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return successResponse(settingsMap);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Get settings error:", error);
    return errorResponse("Erro ao buscar configurações", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const settings = body as Record<string, string>;

    if (!settings || typeof settings !== "object") {
      return errorResponse("Dados inválidos", 400);
    }

    // Upsert each setting
    const operations = Object.entries(settings).map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await prisma.$transaction(operations);

    // Return updated settings
    const allSettings = await prisma.storeSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const setting of allSettings) {
      settingsMap[setting.key] = setting.value;
    }

    return successResponse(settingsMap);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Update settings error:", error);
    return errorResponse("Erro ao atualizar configurações", 500);
  }
}
