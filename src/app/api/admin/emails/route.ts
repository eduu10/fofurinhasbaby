/**
 * POST /api/admin/emails
 *
 * Dispara emails manualmente pelo admin.
 * Suporta os tipos:
 *   - promotion    → envia promoção/cupom para 1 cliente ou todos
 *   - urgency      → avisa sobre estoque baixo de um produto
 *   - newsletter   → envia newsletter para 1 cliente ou todos
 *   - reactivation → reativação para clientes inativos
 *   - daily_summary → resumo diário de vendas para o admin
 *   - review_request → pede avaliação após entrega
 *   - free_shipping_nudge → empurrão de frete grátis
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import {
  sendPromotionEmail,
  sendUrgencyEmail,
  sendNewsletterEmail,
  sendReactivationEmail,
  sendAdminDailySummaryEmail,
  sendReviewRequestEmail,
  sendFreeShippingNudgeEmail,
} from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { type, targetUserId, ...payload } = body;

    if (!type) {
      return errorResponse("Campo 'type' é obrigatório", 400);
    }

    // -----------------------------------------------------------------
    // Buscar destinatários
    // -----------------------------------------------------------------
    let recipients: { id: string; name: string; email: string }[] = [];

    if (targetUserId === "all") {
      recipients = await prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, name: true, email: true },
      });
    } else if (targetUserId) {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true },
      });
      if (!user) return errorResponse("Usuário não encontrado", 404);
      recipients = [user];
    }

    let sent = 0;
    let errors = 0;

    // -----------------------------------------------------------------
    // Resumo diário do admin — não precisa de destinatário externo
    // -----------------------------------------------------------------
    if (type === "daily_summary") {
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { email: true },
      });
      if (!admin) return errorResponse("Admin não encontrado", 404);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [orders, newCustomers, topItems] = await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: today } },
          select: { total: true, status: true },
        }),
        prisma.user.count({
          where: { createdAt: { gte: today }, role: "CUSTOMER" },
        }),
        prisma.orderItem.groupBy({
          by: ["title"],
          where: { order: { createdAt: { gte: today } } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),
      ]);

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const pendingOrders = orders.filter((o) => o.status === "PENDING").length;

      const ok = await sendAdminDailySummaryEmail({
        adminEmail: admin.email,
        date: new Date().toLocaleDateString("pt-BR"),
        totalOrders: orders.length,
        totalRevenue,
        newCustomers,
        pendingOrders,
        topProducts: topItems.map((i) => ({
          title: i.title,
          quantity: i._sum.quantity ?? 0,
        })),
      });

      return successResponse({ sent: ok ? 1 : 0, errors: ok ? 0 : 1 });
    }

    // -----------------------------------------------------------------
    // Emails para clientes
    // -----------------------------------------------------------------
    if (recipients.length === 0) {
      return errorResponse("Nenhum destinatário. Informe targetUserId ou 'all'", 400);
    }

    for (const user of recipients) {
      try {
        let ok = false;

        if (type === "promotion") {
          ok = await sendPromotionEmail({
            to: user.email,
            customerName: user.name,
            title: payload.title,
            description: payload.description,
            couponCode: payload.couponCode,
            discountText: payload.discountText,
            ctaLabel: payload.ctaLabel,
            ctaUrl: payload.ctaUrl,
            validUntil: payload.validUntil,
          });
        } else if (type === "urgency") {
          ok = await sendUrgencyEmail({
            to: user.email,
            customerName: user.name,
            productTitle: payload.productTitle,
            productUrl: payload.productUrl,
            productImage: payload.productImage,
            stockLeft: payload.stockLeft,
            price: payload.price,
          });
        } else if (type === "newsletter") {
          ok = await sendNewsletterEmail({
            to: user.email,
            customerName: user.name,
            subject: payload.subject,
            headline: payload.headline,
            body: payload.body,
            products: payload.products,
            ctaLabel: payload.ctaLabel,
            ctaUrl: payload.ctaUrl,
          });
        } else if (type === "reactivation") {
          ok = await sendReactivationEmail({
            to: user.email,
            customerName: user.name,
            daysSinceLastOrder: payload.daysSinceLastOrder || 30,
            couponCode: payload.couponCode || "VOLTEI10",
          });
        } else if (type === "review_request") {
          // Busca último pedido entregue do usuário
          const order = await prisma.order.findFirst({
            where: { userId: user.id, status: "DELIVERED" },
            orderBy: { createdAt: "desc" },
            include: {
              items: {
                include: {
                  product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } },
                },
              },
            },
          });
          if (!order) continue;

          ok = await sendReviewRequestEmail({
            to: user.email,
            customerName: user.name,
            orderNumber: order.orderNumber,
            items: order.items.map((item) => ({
              title: item.title,
              url: `${process.env.NEXT_PUBLIC_APP_URL || "https://fofurinhasbaby.vercel.app"}/products/${item.product.slug}`,
              image: item.product.images[0]?.url,
            })),
          });
        } else if (type === "free_shipping_nudge") {
          ok = await sendFreeShippingNudgeEmail({
            to: user.email,
            customerName: user.name,
            currentTotal: payload.currentTotal,
            freeShippingThreshold: payload.freeShippingThreshold || 149.9,
          });
        } else {
          return errorResponse(`Tipo '${type}' não reconhecido`, 400);
        }

        if (ok) sent++;
        else errors++;
      } catch {
        errors++;
      }
    }

    return successResponse({
      sent,
      errors,
      total: recipients.length,
      message: `${sent} email(s) enviado(s)${errors > 0 ? `, ${errors} falha(s)` : ""}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("[Admin Emails] Erro:", error);
    return errorResponse("Erro ao enviar emails", 500);
  }
}
