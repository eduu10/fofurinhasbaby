import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const address = await prisma.address.findFirst({
      where: { id, userId: user.id },
    });

    if (!address) {
      return errorResponse("Endereço não encontrado", 404);
    }

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

    // If setting as default, unset other defaults
    if (isDefault && !address.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        label: label !== undefined ? label?.trim() : undefined,
        street: street?.trim() ?? undefined,
        number: number?.trim() ?? undefined,
        complement: complement !== undefined ? complement?.trim() : undefined,
        neighborhood: neighborhood?.trim() ?? undefined,
        city: city?.trim() ?? undefined,
        state: state ? state.trim().toUpperCase() : undefined,
        zipCode: zipCode ? zipCode.replace(/\D/g, "") : undefined,
        country: country ?? undefined,
        isDefault: isDefault ?? undefined,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Update address error:", error);
    return errorResponse("Erro ao atualizar endereço", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const address = await prisma.address.findFirst({
      where: { id, userId: user.id },
    });

    if (!address) {
      return errorResponse("Endereço não encontrado", 404);
    }

    // Check if address is used in any order
    const ordersWithAddress = await prisma.order.count({
      where: { addressId: id },
    });

    if (ordersWithAddress > 0) {
      return errorResponse(
        "Não é possível excluir este endereço pois está vinculado a pedidos",
        400
      );
    }

    await prisma.address.delete({ where: { id } });

    // If deleted address was default, set another one as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { id: "desc" },
      });
      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return successResponse({ message: "Endereço excluído com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Delete address error:", error);
    return errorResponse("Erro ao excluir endereço", 500);
  }
}
