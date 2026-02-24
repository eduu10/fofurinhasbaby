import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin list categories error:", error);
    return errorResponse("Erro ao listar categorias", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, description, image, parentId, sortOrder, isActive } = body;

    if (!name) {
      return errorResponse("Nome da categoria é obrigatório", 400);
    }

    let slug = slugify(name);
    const existingSlug = await prisma.category.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return errorResponse("Categoria pai não encontrada", 404);
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description,
        image,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        isActive: isActive ?? true,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
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
    console.error("Admin create category error:", error);
    return errorResponse("Erro ao criar categoria", 500);
  }
}
