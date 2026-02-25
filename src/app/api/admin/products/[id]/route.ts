import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variations: true,
        category: true,
        reviews: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { orderItems: true } },
      },
    });

    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    return successResponse(product);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin get product error:", error);
    return errorResponse("Erro ao buscar produto", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
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
      minQuantity,
      maxQuantity,
      showStock,
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
      aliexpressUrl,
      aliexpressId,
      autoSync,
      profitMargin,
      images,
      variations,
    } = body;

    let newSlug = product.slug;
    if (title && title !== product.title) {
      newSlug = slugify(title);
      const existingSlug = await prisma.product.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update images if provided
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img: { url: string; alt?: string }, index: number) => ({
              productId: id,
              url: img.url,
              alt: img.alt || title || product.title,
              sortOrder: index,
            })),
          });
        }
      }

      // Update variations if provided
      if (variations !== undefined) {
        // Clear cart items referencing old variations to avoid FK constraint errors
        await tx.cartItem.deleteMany({
          where: {
            productId: id,
            variationId: { not: null },
          },
        });
        await tx.productVariation.deleteMany({ where: { productId: id } });
        if (variations.length > 0) {
          await tx.productVariation.createMany({
            data: variations.map(
              (v: { name: string; value: string; price?: number; stock?: number; sku?: string; image?: string }) => ({
                productId: id,
                name: v.name,
                value: v.value,
                price: v.price || null,
                stock: v.stock || 0,
                sku: v.sku || null,
                image: v.image || null,
              })
            ),
          });
        }
      }

      return tx.product.update({
        where: { id },
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
          minQuantity: minQuantity ?? undefined,
          maxQuantity: maxQuantity ?? undefined,
          showStock: showStock ?? undefined,
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
          aliexpressUrl: aliexpressUrl ?? undefined,
          aliexpressId: aliexpressId ?? undefined,
          autoSync: autoSync ?? undefined,
          profitMargin: profitMargin ?? undefined,
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variations: true,
          category: true,
        },
      });
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin update product error:", error);
    return errorResponse("Erro ao atualizar produto", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!product) {
      return errorResponse("Produto não encontrado", 404);
    }

    if (product._count.orderItems > 0) {
      // Soft delete - just deactivate
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return successResponse({ message: "Produto desativado (possui pedidos associados)" });
    }

    await prisma.product.delete({ where: { id } });

    return successResponse({ message: "Produto excluído com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin delete product error:", error);
    return errorResponse("Erro ao excluir produto", 500);
  }
}
