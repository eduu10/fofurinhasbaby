import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
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
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!category) {
      return errorResponse("Categoria não encontrada", 404);
    }

    return successResponse(category);
  } catch (error) {
    console.error("Get category error:", error);
    return errorResponse("Erro ao buscar categoria", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin();
    const { slug } = await params;

    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      return errorResponse("Categoria não encontrada", 404);
    }

    const body = await request.json();
    const { name, description, image, parentId, isActive, sortOrder } = body;

    let newSlug = slug;
    if (name && name !== category.name) {
      newSlug = slugify(name);
      const existingSlug = await prisma.category.findFirst({
        where: { slug: newSlug, id: { not: category.id } },
      });
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    const updated = await prisma.category.update({
      where: { slug },
      data: {
        name: name ?? undefined,
        slug: newSlug,
        description: description ?? undefined,
        image: image ?? undefined,
        parentId: parentId ?? undefined,
        isActive: isActive ?? undefined,
        sortOrder: sortOrder ?? undefined,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Update category error:", error);
    return errorResponse("Erro ao atualizar categoria", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin();
    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return errorResponse("Categoria não encontrada", 404);
    }

    if (category._count.products > 0) {
      return errorResponse("Não é possível excluir categoria com produtos associados", 400);
    }

    await prisma.category.delete({ where: { slug } });

    return successResponse({ message: "Categoria excluída com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Delete category error:", error);
    return errorResponse("Erro ao excluir categoria", 500);
  }
}
