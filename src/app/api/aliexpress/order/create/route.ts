import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { createDropshippingOrder, isAliExpressConfigured } from "@/lib/aliexpress";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/aliexpress/order/create
 * Cria um pedido no AliExpress automaticamente (fulfillment).
 * Rota protegida — requer autenticação.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return errorResponse("ID do pedido local é obrigatório", 400);
    }

    // Buscar pedido local com itens, endereço e dados do usuário
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: user.id },
          // Admin pode processar qualquer pedido
          ...(user.role === "ADMIN" ? [{}] : []),
        ],
      },
      include: {
        user: { select: { name: true, phone: true } },
        items: {
          include: {
            product: {
              select: {
                aliexpressId: true,
                title: true,
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      return errorResponse("Pedido não encontrado", 404);
    }

    if (order.status !== "PAID") {
      return errorResponse("Pedido precisa estar com pagamento confirmado", 400);
    }

    if (!order.address) {
      return errorResponse("Endereço de entrega não encontrado no pedido", 400);
    }

    // Verificar se já foi enviado ao AliExpress
    if (order.aliexpressOrderId) {
      return errorResponse(
        `Pedido já enviado ao AliExpress (ID: ${order.aliexpressOrderId})`,
        409,
      );
    }

    if (!isAliExpressConfigured()) {
      return errorResponse(
        "Credenciais do AliExpress não configuradas. Configure no painel de administração.",
        503,
      );
    }

    // Filtrar itens que possuem aliexpressId
    const aeItems = order.items.filter((item) => item.product.aliexpressId);

    if (aeItems.length === 0) {
      return errorResponse(
        "Nenhum item deste pedido possui ID do AliExpress vinculado",
        400,
      );
    }

    // Criar pedido no AliExpress
    const result = await createDropshippingOrder({
      address: {
        fullName: order.user.name,
        phone: order.user.phone ?? "",
        address: `${order.address.street}, ${order.address.number}`,
        address2: order.address.complement ?? undefined,
        city: order.address.city,
        province: order.address.state,
        zipCode: order.address.zipCode,
        country: "BR",
      },
      items: aeItems.map((item) => ({
        productId: Number(item.product.aliexpressId),
        skuAttr: item.variationId ?? undefined,
        quantity: item.quantity,
      })),
    });

    if (!result) {
      return errorResponse("Erro ao criar pedido no AliExpress", 502);
    }

    // Salvar o orderId do AliExpress no pedido local
    await prisma.order.update({
      where: { id: orderId },
      data: {
        aliexpressOrderId: result.orderId,
        status: "PROCESSING",
      },
    });

    // Registrar no histórico
    await prisma.orderHistory.create({
      data: {
        orderId,
        status: "PROCESSING",
        note: `Pedido enviado ao AliExpress. ID: ${result.orderId}`,
      },
    });

    return successResponse({
      aliexpressOrderId: result.orderId,
      aliexpressOrderIds: result.orderIds,
      message: "Pedido criado no AliExpress com sucesso",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return errorResponse("Faça login para continuar", 401);
      }
      if (error.message === "Forbidden") {
        return errorResponse("Acesso negado", 403);
      }
    }
    console.error("AliExpress order create error:", error);
    return errorResponse("Erro ao criar pedido no AliExpress", 500);
  }
}
