import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return errorResponse("Categoria não encontrada", 404);
    }

    const body = await request.json();
    const { name, description, image, parentId, sortOrder, isActive } = body;

    let newSlug = category.slug;
    if (name && name !== category.name) {
      newSlug = slugify(name);
      const existingSlug = await prisma.category.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    // Prevent circular parent reference
    if (parentId === id) {
      return errorResponse("Uma categoria não pode ser pai de si mesma", 400);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? undefined,
        slug: newSlug,
        description: description ?? undefined,
        image: image ?? undefined,
        parentId: parentId !== undefined ? parentId : undefined,
        sortOrder: sortOrder ?? undefined,
        isActive: isActive ?? undefined,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
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
    console.error("Admin update category error:", error);
    return errorResponse("Erro ao atualizar categoria", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return errorResponse("Categoria não encontrada", 404);
    }

    if (category._count.products > 0) {
      return errorResponse(
        "Não é possível excluir categoria com produtos associados. Remova os produtos primeiro.",
        400
      );
    }

    if (category._count.children > 0) {
      return errorResponse(
        "Não é possível excluir categoria com subcategorias. Remova as subcategorias primeiro.",
        400
      );
    }

    await prisma.category.delete({ where: { id } });

    return successResponse({ message: "Categoria excluída com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin delete category error:", error);
    return errorResponse("Erro ao excluir categoria", 500);
  }
}
