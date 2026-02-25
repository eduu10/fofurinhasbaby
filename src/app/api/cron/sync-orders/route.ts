import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderStatus, isAliExpressConfigured, getHybridClient, getUsdToBrlRate } from "@/lib/aliexpress";
import { sendOrderStatusEmail, sendShippingNotificationEmail } from "@/lib/email";
import { recalculatePrice, isMarginBelowMinimum } from "@/lib/pricing/calculator";
import type { OrderStatus } from "@prisma/client";

/**
 * GET /api/cron/sync-orders
 *
 * Cron job unificado que executa 3 tarefas diárias:
 * 1. Sincronizar status de pedidos com AliExpress
 * 2. Sincronizar estoque e preços dos produtos via Omkar
 * 3. Registrar histórico de preços para análise de margem
 *
 * Executado 1x/dia via Vercel Cron (0 8 * * *).
 * Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    if (!isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const results = {
      orderSync: { updated: 0, errors: 0, total: 0 },
      priceSync: { updated: 0, outOfStock: 0, errors: 0, total: 0 },
      alerts: [] as string[],
    };

    // =====================================================================
    // TAREFA 1: Sincronizar status de pedidos
    // =====================================================================
    if (isAliExpressConfigured()) {
      const orderResults = await syncOrderStatuses();
      results.orderSync = orderResults;
    }

    // =====================================================================
    // TAREFA 2: Sincronizar preços e estoque dos produtos
    // =====================================================================
    const priceResults = await syncProductPricesAndStock();
    results.priceSync = priceResults.stats;
    results.alerts.push(...priceResults.alerts);

    // =====================================================================
    // Notificar admin se houver alertas
    // =====================================================================
    if (results.alerts.length > 0) {
      await notifyAdmin(results.alerts);
    }

    console.log(
      `[Cron] Sync concluído: Pedidos ${results.orderSync.updated}/${results.orderSync.total}, ` +
      `Preços ${results.priceSync.updated}/${results.priceSync.total}, ` +
      `${results.alerts.length} alertas`,
    );

    return NextResponse.json({
      message: "Sync completed",
      ...results,
    });
  } catch (error) {
    console.error("[Cron] Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// TAREFA 1: Sincronizar pedidos
// ---------------------------------------------------------------------------

async function syncOrderStatuses() {
  const stats = { updated: 0, errors: 0, total: 0 };

  const orders = await prisma.order.findMany({
    where: {
      aliexpressOrderId: { not: null },
      status: { in: ["PROCESSING", "SHIPPED"] },
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    take: 50,
    orderBy: { updatedAt: "asc" },
  });

  stats.total = orders.length;
  if (orders.length === 0) return stats;

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
      if (!aeStatus) continue;

      const newLocalStatus = statusMap[aeStatus.status];
      if (!newLocalStatus) continue;

      let hasChanges = false;
      const updateData: { status?: OrderStatus; trackingCode?: string } = {};

      if (newLocalStatus !== order.status) {
        updateData.status = newLocalStatus;
        hasChanges = true;
      }
      if (aeStatus.trackingCode && aeStatus.trackingCode !== order.trackingCode) {
        updateData.trackingCode = aeStatus.trackingCode;
        hasChanges = true;
      }

      if (!hasChanges) continue;

      await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          status: updateData.status || order.status,
          note: `[Sync automático] Status AliExpress: ${aeStatus.statusTranslated}${
            aeStatus.trackingCode ? ` | Rastreio: ${aeStatus.trackingCode}` : ""
          }`,
        },
      });

      const effectiveStatus = updateData.status || order.status;

      if (updateData.status === "SHIPPED" && aeStatus.trackingCode) {
        await sendShippingNotificationEmail({
          to: order.user.email,
          customerName: order.user.name,
          orderNumber: order.orderNumber,
          trackingCode: aeStatus.trackingCode,
          trackingUrl: aeStatus.trackingUrl ?? undefined,
          carrier: aeStatus.logisticsService ?? undefined,
        });
      } else if (updateData.status) {
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

      stats.updated++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[Cron] Erro sync pedido ${order.id}:`, error);
      stats.errors++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// TAREFA 2: Sincronizar preços e estoque
// ---------------------------------------------------------------------------

async function syncProductPricesAndStock() {
  const stats = { updated: 0, outOfStock: 0, errors: 0, total: 0 };
  const alerts: string[] = [];

  // Buscar produtos com sync ativo e aliexpressProductId preenchido
  const products = await prisma.product.findMany({
    where: {
      syncPrice: true,
      aliexpressProductId: { not: null },
    },
    select: {
      id: true,
      title: true,
      aliexpressProductId: true,
      costPriceUSD: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      outOfStock: true,
    },
    take: 100,
    orderBy: { lastSyncAt: { sort: "asc", nulls: "first" } },
  });

  stats.total = products.length;
  if (products.length === 0) return { stats, alerts };

  const client = getHybridClient();
  const exchangeRate = await getUsdToBrlRate();

  for (const product of products) {
    try {
      const productData = await client.getProduct(product.aliexpressProductId!);

      if (!productData) {
        await prisma.product.update({
          where: { id: product.id },
          data: { lastSyncAt: new Date() },
        });
        continue;
      }

      const updateData: Record<string, unknown> = {
        lastSyncAt: new Date(),
      };

      // Verificar estoque
      if (productData.stock === 0) {
        if (!product.outOfStock) {
          updateData.outOfStock = true;
          updateData.isActive = false;
          stats.outOfStock++;
          alerts.push(`Sem estoque: "${product.title}" (AE: ${product.aliexpressProductId})`);
        }
      } else if (product.outOfStock && productData.stock > 0) {
        updateData.outOfStock = false;
        updateData.stock = productData.stock;
      } else {
        updateData.stock = productData.stock;
      }

      // Verificar variação de preço
      const oldCostUSD = product.costPriceUSD ?? 0;
      const newCostUSD = productData.priceUSD;

      if (newCostUSD > 0 && oldCostUSD > 0) {
        const priceDiffPercent = Math.abs((newCostUSD - oldCostUSD) / oldCostUSD) * 100;

        if (priceDiffPercent > 10) {
          updateData.costPriceUSD = newCostUSD;

          const { newPrice, newCompareAt } = recalculatePrice(newCostUSD, exchangeRate);
          updateData.price = newPrice;
          updateData.compareAtPrice = newCompareAt;
          updateData.costPrice = Math.round(newCostUSD * exchangeRate * 100) / 100;

          stats.updated++;

          // Salvar histórico de preço
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              costUSD: newCostUSD,
              sellBRL: newPrice,
              exchangeRate,
            },
          });

          if (newCostUSD > oldCostUSD * 1.2) {
            alerts.push(
              `Preço subiu ${priceDiffPercent.toFixed(0)}%: "${product.title}" ` +
              `(USD ${oldCostUSD.toFixed(2)} → ${newCostUSD.toFixed(2)})`,
            );
          }

          if (isMarginBelowMinimum(newCostUSD, Number(product.price), exchangeRate)) {
            alerts.push(
              `Margem baixa: "${product.title}" pode estar com lucro < 40%`,
            );
          }
        }
      } else if (newCostUSD > 0 && oldCostUSD === 0) {
        updateData.costPriceUSD = newCostUSD;
        const { newPrice, newCompareAt } = recalculatePrice(newCostUSD, exchangeRate);
        updateData.price = newPrice;
        updateData.compareAtPrice = newCompareAt;
        updateData.costPrice = Math.round(newCostUSD * exchangeRate * 100) / 100;
        stats.updated++;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`[Cron] Erro sync produto ${product.id}:`, error);
      stats.errors++;
    }
  }

  return { stats, alerts };
}

// ---------------------------------------------------------------------------
// Notificação por email ao admin
// ---------------------------------------------------------------------------

async function notifyAdmin(alerts: string[]) {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { email: true, name: true },
  });

  if (!admin) return;

  const alertsHtml = alerts.map((a) => `<li style="margin:4px 0;color:#b91c1c;">${a}</li>`).join("");

  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "Fofurinhas Baby <noreply@fofurinhasbaby.com>";

    if (!smtpHost || !smtpPass) {
      console.log("[Cron] Alertas para admin:", alerts);
      return;
    }

    await fetch(`https://${smtpHost}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${smtpPass}`,
      },
      body: JSON.stringify({
        from: smtpFrom,
        to: [admin.email],
        subject: `[Fofurinhas] ${alerts.length} alerta(s) de sync`,
        html: `
          <h2>Alertas do Sync Diário</h2>
          <ul>${alertsHtml}</ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">Abrir painel admin</a></p>
        `,
      }),
    });
  } catch (error) {
    console.error("[Cron] Erro ao notificar admin:", error);
  }
}
