import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return errorResponse("sessionId é obrigatório", 400);
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            variation: true,
          },
        },
        coupon: true,
      },
    });

    if (!cart) {
      return successResponse({ items: [], sessionId });
    }

    return successResponse(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    return errorResponse("Erro ao buscar carrinho", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, productId, variationId, quantity } = body;

    if (!sessionId || !productId) {
      return errorResponse("sessionId e productId são obrigatórios", 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true, isDraft: false },
    });

    if (!product) {
      return errorResponse("Produto não encontrado ou indisponível", 404);
    }

    if (variationId) {
      const variation = await prisma.productVariation.findUnique({
        where: { id: variationId, productId },
      });
      if (!variation) {
        return errorResponse("Variação não encontrada", 404);
      }
    }

    let cart = await prisma.cart.findUnique({
      where: { sessionId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
      });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variationId: {
          cartId: cart.id,
          productId,
          variationId: variationId || null,
        },
      },
    });

    let cartItem;

    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + (quantity || 1) },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
          variation: true,
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variationId: variationId || null,
          quantity: quantity || 1,
        },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
          variation: true,
        },
      });
    }

    return successResponse(cartItem, 201);
  } catch (error) {
    console.error("Add to cart error:", error);
    return errorResponse("Erro ao adicionar ao carrinho", 500);
  }
}
