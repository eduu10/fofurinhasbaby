import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderStatus, isAliExpressConfigured } from "@/lib/aliexpress";
import { sendOrderStatusEmail, sendShippingNotificationEmail } from "@/lib/email";
import type { OrderStatus } from "@prisma/client";

/**
 * GET /api/cron/sync-orders
 * Cron job para sincronizar status de pedidos com AliExpress.
 * Executado a cada 2 horas via Vercel Cron.
 *
 * Protegido por CRON_SECRET para evitar chamadas não autorizadas.
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autorização via CRON_SECRET ou Vercel cron header
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Vercel envia o header automaticamente em cron jobs
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    if (!isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!isAliExpressConfigured()) {
      return NextResponse.json({
        message: "AliExpress not configured, skipping sync",
        synced: 0,
      });
    }

    // Buscar pedidos que precisam de sync (PROCESSING ou SHIPPED com aliexpressOrderId)
    const orders = await prisma.order.findMany({
      where: {
        aliexpressOrderId: { not: null },
        status: { in: ["PROCESSING", "SHIPPED"] },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      take: 50, // Limitar para evitar timeout
      orderBy: { updatedAt: "asc" }, // Priorizar os mais antigos
    });

    if (orders.length === 0) {
      return NextResponse.json({
        message: "No orders to sync",
        synced: 0,
      });
    }

    const results = {
      total: orders.length,
      updated: 0,
      errors: 0,
      details: [] as { orderId: string; orderNumber: string; action: string }[],
    };

    // Mapear status do AliExpress para local
    const statusMap: Record<string, OrderStatus> = {
      WAIT_SELLER_SEND_GOODS: "PROCESSING",
      SELLER_SEND_GOODS: "SHIPPED",
      WAIT_BUYER_ACCEPT_GOODS: "SHIPPED",
      BUYER_ACCEPT_GOODS: "DELIVERED",
      FINISH: "DELIVERED",
    };

    const statusLabels: Record<string, string> = {
      PROCESSING: "Em processamento",
      SHIPPED: "Enviado",
      DELIVERED: "Entregue",
    };

    const statusMessages: Record<string, string> = {
      PROCESSING: "Seu pedido está sendo preparado pelo fornecedor.",
      SHIPPED: "Seu pedido foi enviado e está a caminho!",
      DELIVERED: "Seu pedido foi entregue com sucesso!",
    };

    for (const order of orders) {
      try {
        const aeStatus = await getOrderStatus(order.aliexpressOrderId!);

        if (!aeStatus) {
          results.details.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            action: "skip_no_status",
          });
          continue;
        }

        const newLocalStatus = statusMap[aeStatus.status];
        if (!newLocalStatus) {
          results.details.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            action: `skip_unknown_status_${aeStatus.status}`,
          });
          continue;
        }

        let hasChanges = false;
        const updateData: { status?: OrderStatus; trackingCode?: string } = {};

        // Verificar mudança de status
        if (newLocalStatus !== order.status) {
          updateData.status = newLocalStatus;
          hasChanges = true;
        }

        // Verificar código de rastreio
        if (aeStatus.trackingCode && aeStatus.trackingCode !== order.trackingCode) {
          updateData.trackingCode = aeStatus.trackingCode;
          hasChanges = true;
        }

        if (!hasChanges) {
          results.details.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            action: "no_changes",
          });
          continue;
        }

        // Atualizar pedido
        await prisma.order.update({
          where: { id: order.id },
          data: updateData,
        });

        // Registrar histórico
        await prisma.orderHistory.create({
          data: {
            orderId: order.id,
            status: updateData.status || order.status,
            note: `[Sync automático] Status AliExpress: ${aeStatus.statusTranslated}${
              aeStatus.trackingCode ? ` | Rastreio: ${aeStatus.trackingCode}` : ""
            }`,
          },
        });

        // Enviar email de notificação
        const effectiveStatus = updateData.status || order.status;

        if (updateData.status === "SHIPPED" && aeStatus.trackingCode) {
          // Email especial com código de rastreio
          await sendShippingNotificationEmail({
            to: order.user.email,
            customerName: order.user.name,
            orderNumber: order.orderNumber,
            trackingCode: aeStatus.trackingCode,
            trackingUrl: aeStatus.trackingUrl ?? undefined,
            carrier: aeStatus.logisticsService ?? undefined,
          });
        } else if (updateData.status) {
          // Email genérico de mudança de status
          await sendOrderStatusEmail({
            to: order.user.email,
            customerName: order.user.name,
            orderNumber: order.orderNumber,
            status: effectiveStatus,
            statusLabel: statusLabels[effectiveStatus] || effectiveStatus,
            message: statusMessages[effectiveStatus] || "O status do seu pedido foi atualizado.",
            trackingCode: aeStatus.trackingCode ?? undefined,
            trackingUrl: aeStatus.trackingUrl ?? undefined,
          });
        }

        results.updated++;
        results.details.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          action: `updated_to_${effectiveStatus}`,
        });

        // Delay entre requests para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error);
        results.errors++;
        results.details.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          action: "error",
        });
      }
    }

    console.log(
      `[Cron] Order sync completed: ${results.updated}/${results.total} updated, ${results.errors} errors`,
    );

    return NextResponse.json({
      message: "Order sync completed",
      ...results,
    });
  } catch (error) {
    console.error("[Cron] Sync orders failed:", error);
    return NextResponse.json(
      { error: "Sync failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
