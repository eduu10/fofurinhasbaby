import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireAuth();

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    });

    return successResponse(addresses);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("List addresses error:", error);
    return errorResponse("Erro ao listar endereços", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const {
      label,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      country,
      isDefault,
    } = body;

    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      return errorResponse(
        "Rua, número, bairro, cidade, estado e CEP são obrigatórios",
        400
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first address, make it default
    const addressCount = await prisma.address.count({
      where: { userId: user.id },
    });

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label: label?.trim(),
        street: street.trim(),
        number: number.trim(),
        complement: complement?.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: zipCode.replace(/\D/g, ""),
        country: country || "BR",
        isDefault: isDefault || addressCount === 0,
      },
    });

    return successResponse(address, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Create address error:", error);
    return errorResponse("Erro ao criar endereço", 500);
  }
}
