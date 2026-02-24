import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true, isDraft: false },
            },
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return successResponse(categories);
  } catch (error) {
    console.error("List categories error:", error);
    return errorResponse("Erro ao listar categorias", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, description, image, parentId, sortOrder } = body;

    if (!name) {
      return errorResponse("Nome da categoria é obrigatório", 400);
    }

    let slug = slugify(name);
    const existingSlug = await prisma.category.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description,
        image,
        parentId,
        sortOrder: sortOrder || 0,
      },
    });

    return successResponse(category, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Create category error:", error);
    return errorResponse("Erro ao criar categoria", 500);
  }
}
