import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireAuth();

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true, reviews: true, addresses: true },
        },
      },
    });

    if (!profile) {
      return errorResponse("Usuário não encontrado", 404);
    }

    return successResponse(profile);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Get profile error:", error);
    return errorResponse("Erro ao buscar perfil", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { name, phone, email } = body;

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingUser && existingUser.id !== user.id) {
        return errorResponse("Este email já está em uso", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name?.trim() ?? undefined,
        phone: phone?.trim() ?? undefined,
        email: email ? email.toLowerCase().trim() : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Update profile error:", error);
    return errorResponse("Erro ao atualizar perfil", 500);
  }
}
