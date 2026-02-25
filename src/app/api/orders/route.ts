import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const where = { userId: user.id };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
          history: { orderBy: { createdAt: "desc" } },
          address: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return successResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("List orders error:", error);
    return errorResponse("Erro ao listar pedidos", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { addressId, paymentMethod, items, couponCode, shipping, notes } = body;

    if (!addressId || !items || !items.length) {
      return errorResponse("Endereço e itens são obrigatórios", 400);
    }

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: user.id },
    });

    if (!address) {
      return errorResponse("Endereço não encontrado", 404);
    }

    let subtotal = 0;
    const orderItems: {
      productId: string;
      variationId: string | null;
      title: string;
      price: number;
      quantity: number;
      image: string | null;
    }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, isActive: true, isDraft: false },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variations: true,
        },
      });

      if (!product) {
        return errorResponse(`Produto ${item.productId} não encontrado ou indisponível`, 404);
      }

      let itemPrice = Number(product.price);
      let variationId = null;

      if (item.variationId) {
        const variation = product.variations.find((v) => v.id === item.variationId);
        if (!variation) {
          return errorResponse(`Variação ${item.variationId} não encontrada`, 404);
        }
        if (variation.price) {
          itemPrice = Number(variation.price);
        }
        variationId = variation.id;
      }

      const quantity = item.quantity || 1;
      subtotal += itemPrice * quantity;

      orderItems.push({
        productId: product.id,
        variationId,
        title: product.title,
        price: itemPrice,
        quantity,
        image: product.images[0]?.url || null,
      });
    }

    let discount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          return errorResponse("Cupom expirado", 400);
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return errorResponse("Cupom esgotado", 400);
        }
        if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
          return errorResponse(
            `Valor mínimo para este cupom: R$ ${Number(coupon.minPurchase).toFixed(2)}`,
            400
          );
        }

        if (coupon.type === "PERCENTAGE") {
          discount = subtotal * (Number(coupon.value) / 100);
        } else {
          discount = Number(coupon.value);
        }

        couponId = coupon.id;
      }
    }

    const shippingCost = shipping || 0;
    const total = subtotal - discount + shippingCost;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: user.id,
          addressId,
          subtotal,
          shipping: shippingCost,
          discount,
          total,
          couponId,
          paymentMethod,
          paymentStatus: "PENDING",
          notes,
          items: {
            create: orderItems,
          },
          history: {
            create: {
              status: "PENDING",
              note: "Pedido criado",
            },
          },
        },
        include: {
          items: true,
          history: true,
          address: true,
        },
      });

      // Update coupon usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Update product sales count
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            salesCount: { increment: item.quantity },
            stock: { decrement: item.quantity },
          },
        });
      }

      return newOrder;
    });

    // Enviar e-mails em background (sem bloquear a resposta)
    const emailItems = orderItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    }));

    // E-mail de confirmação para o cliente
    sendOrderConfirmationEmail({
      to: user.email,
      customerName: user.name,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      items: emailItems,
    }).catch((err) => console.error("[Email] Confirmação de pedido falhou:", err));

    // E-mail de novo pedido para o admin
    prisma.user
      .findFirst({ where: { role: "ADMIN" }, select: { email: true } })
      .then((admin) => {
        if (admin) {
          sendAdminNewOrderEmail({
            adminEmail: admin.email,
            customerName: user.name,
            orderNumber: order.orderNumber,
            total: Number(order.total),
            paymentMethod: paymentMethod || "pix",
            items: emailItems,
          }).catch((err) => console.error("[Email] Notificação admin falhou:", err));
        }
      })
      .catch((err) => console.error("[Email] Busca admin falhou:", err));

    return successResponse(order, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    console.error("Create order error:", error);
    return errorResponse("Erro ao criar pedido", 500);
  }
}
