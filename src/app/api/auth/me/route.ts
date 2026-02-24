import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return errorResponse("Não autenticado", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        addresses: {
          orderBy: { isDefault: "desc" },
        },
      },
    });

    if (!user) {
      return errorResponse("Usuário não encontrado", 404);
    }

    return successResponse(user);
  } catch (error) {
    console.error("Get me error:", error);
    return errorResponse("Erro ao buscar perfil", 500);
  }
}
