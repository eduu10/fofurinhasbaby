import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isDraft: false,
    };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    if (minPrice) {
      where.price = { ...((where.price as Prisma.DecimalFilter) || {}), gte: parseFloat(minPrice) };
    }

    if (maxPrice) {
      where.price = { ...((where.price as Prisma.DecimalFilter) || {}), lte: parseFloat(maxPrice) };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {};

    switch (sort) {
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "sales":
        orderBy = { salesCount: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: { select: { id: true, name: true, slug: true } },
          variations: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return successResponse({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("List products error:", error);
    return errorResponse("Erro ao listar produtos", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

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
      images,
      variations,
    } = body;

    if (!title || price === undefined) {
      return errorResponse("Título e preço são obrigatórios", 400);
    }

    let slug = slugify(title);
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = await prisma.product.create({
      data: {
        title,
        slug,
        description,
        shortDescription,
        sku,
        price,
        compareAtPrice,
        costPrice,
        stock: stock || 0,
        categoryId,
        isActive: isActive ?? true,
        isDraft: isDraft ?? false,
        isFeatured: isFeatured ?? false,
        weight,
        width,
        height,
        length,
        metaTitle,
        metaDescription,
        images: images?.length
          ? {
              create: images.map((img: { url: string; alt?: string }, index: number) => ({
                url: img.url,
                alt: img.alt || title,
                sortOrder: index,
              })),
            }
          : undefined,
        variations: variations?.length
          ? {
              create: variations.map(
                (v: { name: string; value: string; price?: number; stock?: number; sku?: string; image?: string }) => ({
                  name: v.name,
                  value: v.value,
                  price: v.price,
                  stock: v.stock || 0,
                  sku: v.sku,
                  image: v.image,
                })
              ),
            }
          : undefined,
      },
      include: {
        images: true,
        variations: true,
        category: true,
      },
    });

    return successResponse(product, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Create product error:", error);
    return errorResponse("Erro ao criar produto", 500);
  }
}
