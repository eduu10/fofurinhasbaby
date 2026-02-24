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

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variations: true,
        category: { select: { id: true, name: true, slug: true } },
        reviews: {
          where: { isApproved: true },
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    return successResponse(product);
  } catch (error) {
    console.error("Get product error:", error);
    return errorResponse("Erro ao buscar produto", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin();
    const { slug } = await params;

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    const body = await request.json();
    const {
      title,
      description,
      shortDescription,
      sku,
      price,
      compareAtPrice,
      costPrice,
      stock,
      categoryId,
      isActive,
      isDraft,
      isFeatured,
      weight,
      width,
      height,
      length,
      metaTitle,
      metaDescription,
    } = body;

    let newSlug = slug;
    if (title && title !== product.title) {
      newSlug = slugify(title);
      const existingSlug = await prisma.product.findFirst({
        where: { slug: newSlug, id: { not: product.id } },
      });
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    const updated = await prisma.product.update({
      where: { slug },
      data: {
        title: title ?? undefined,
        slug: newSlug,
        description: description ?? undefined,
        shortDescription: shortDescription ?? undefined,
        sku: sku ?? undefined,
        price: price ?? undefined,
        compareAtPrice: compareAtPrice ?? undefined,
        costPrice: costPrice ?? undefined,
        stock: stock ?? undefined,
        categoryId: categoryId ?? undefined,
        isActive: isActive ?? undefined,
        isDraft: isDraft ?? undefined,
        isFeatured: isFeatured ?? undefined,
        weight: weight ?? undefined,
        width: width ?? undefined,
        height: height ?? undefined,
        length: length ?? undefined,
        metaTitle: metaTitle ?? undefined,
        metaDescription: metaDescription ?? undefined,
      },
      include: {
        images: true,
        variations: true,
        category: true,
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
    console.error("Update product error:", error);
    return errorResponse("Erro ao atualizar produto", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin();
    const { slug } = await params;

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    await prisma.product.delete({ where: { slug } });

    return successResponse({ message: "Produto excluído com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Delete product error:", error);
    return errorResponse("Erro ao excluir produto", 500);
  }
}
