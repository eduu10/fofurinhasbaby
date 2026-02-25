/**
 * Gestão de Pedidos Dropshipping
 *
 * Quando um pedido é pago via Stripe webhook:
 * 1. Registra pedido no banco com status "processing"
 * 2. Gera link de afiliado via ae_sdk AffiliateClient
 * 3. Salva link de afiliado e dados de compra no pedido
 * 4. Envia email ao admin com link de compra e dados do cliente
 *
 * TODO: Quando a API oficial de DS do AliExpress for liberada,
 * migrar para DropshipperClient do ae_sdk automaticamente.
 */

import { prisma } from "@/lib/prisma";
import { getHybridClient } from "@/lib/aliexpress";
import type { Order, OrderItem, Product, User, Address } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface OrderWithRelations extends Order {
  user: Pick<User, "name" | "email" | "phone">;
  items: (OrderItem & {
    product: Pick<Product, "aliexpressId" | "aliexpressUrl" | "title" | "costPriceUSD">;
  })[];
  address: Address;
}

interface DropshipResult {
  success: boolean;
  affiliateUrl: string | null;
  purchaseUrl: string | null;
  message: string;
}

// ---------------------------------------------------------------------------
// Funções principais
// ---------------------------------------------------------------------------

/**
 * Processa um pedido pago para dropshipping.
 * Gera links de afiliado e registra informações de compra.
 */
export async function processDropshipOrder(orderId: string): Promise<DropshipResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          product: {
            select: {
              aliexpressId: true,
              aliexpressUrl: true,
              title: true,
              costPriceUSD: true,
            },
          },
        },
      },
      address: true,
    },
  }) as OrderWithRelations | null;

  if (!order) {
    return { success: false, affiliateUrl: null, purchaseUrl: null, message: "Pedido não encontrado" };
  }

  // Filtrar itens que vêm do AliExpress
  const aeItems = order.items.filter((item) => item.product.aliexpressUrl || item.product.aliexpressId);

  if (aeItems.length === 0) {
    return { success: false, affiliateUrl: null, purchaseUrl: null, message: "Nenhum item do AliExpress" };
  }

  const client = getHybridClient();

  // Gerar links de afiliado para cada produto (receita extra por compra)
  const firstItem = aeItems[0];
  const productUrl = firstItem.product.aliexpressUrl
    ?? `https://www.aliexpress.com/item/${firstItem.product.aliexpressId}.html`;

  let affiliateUrl = productUrl;
  try {
    affiliateUrl = await client.generateAffiliateLink(productUrl);
  } catch (error) {
    console.error("[Dropship] Erro ao gerar link de afiliado:", error);
  }

  // Calcular custo total estimado em USD
  const totalCostUSD = aeItems.reduce((sum, item) => {
    const cost = item.product.costPriceUSD ?? 0;
    return sum + cost * item.quantity;
  }, 0);

  // Salvar dados de dropship no banco
  // TODO: Quando API de DS for liberada, criar pedido automaticamente via DropshipperClient
  await prisma.orderDropshipInfo.upsert({
    where: { orderId: order.id },
    update: {
      affiliateUrl: affiliateUrl !== productUrl ? affiliateUrl : null,
      purchaseUrl: productUrl,
      costTotalUSD: totalCostUSD,
      estimatedMarginBRL: Number(order.total) - totalCostUSD * 5.5, // estimativa
    },
    create: {
      orderId: order.id,
      affiliateUrl: affiliateUrl !== productUrl ? affiliateUrl : null,
      purchaseUrl: productUrl,
      costTotalUSD: totalCostUSD,
      estimatedMarginBRL: Number(order.total) - totalCostUSD * 5.5,
    },
  });

  // Enviar email ao admin com instruções de compra
  await sendAdminPurchaseEmail(order, aeItems, affiliateUrl);

  return {
    success: true,
    affiliateUrl: affiliateUrl !== productUrl ? affiliateUrl : null,
    purchaseUrl: productUrl,
    message: `Pedido processado. ${aeItems.length} item(s) do AliExpress.`,
  };
}

/**
 * Envia email ao admin com link de compra e dados do cliente.
 */
async function sendAdminPurchaseEmail(
  order: OrderWithRelations,
  aeItems: OrderWithRelations["items"],
  affiliateUrl: string,
) {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { email: true },
  });

  if (!admin) return;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "Fofurinhas Baby <noreply@fofurinhasbaby.com>";

  if (!smtpHost || !smtpPass) {
    console.log("[Dropship] Email para admin (SMTP não configurado):");
    console.log(`  Pedido: #${order.orderNumber}`);
    console.log(`  Cliente: ${order.user.name} (${order.user.email})`);
    console.log(`  Link de compra: ${affiliateUrl}`);
    return;
  }

  const itemsHtml = aeItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.product.title}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
          US$ ${(item.product.costPriceUSD ?? 0).toFixed(2)}
        </td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#ec4899;">Novo Pedido para Compra no AliExpress</h2>

      <div style="background:#fdf2f8;padding:16px;border-radius:8px;margin:16px 0;">
        <p><strong>Pedido:</strong> #${order.orderNumber}</p>
        <p><strong>Total cobrado:</strong> R$ ${Number(order.total).toFixed(2)}</p>
      </div>

      <h3>Dados do Cliente (para envio):</h3>
      <p>
        <strong>${order.user.name}</strong><br>
        ${order.address.street}, ${order.address.number}
        ${order.address.complement ? `, ${order.address.complement}` : ""}<br>
        ${order.address.neighborhood} — ${order.address.city}/${order.address.state}<br>
        CEP: ${order.address.zipCode}<br>
        Tel: ${order.user.phone ?? "Não informado"}
      </p>

      <h3>Itens para comprar:</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:left;">Produto</th>
            <th style="padding:8px;text-align:center;">Qtd</th>
            <th style="padding:8px;text-align:right;">Custo</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="margin:24px 0;text-align:center;">
        <a href="${affiliateUrl}"
           style="display:inline-block;background:#ec4899;color:white;padding:14px 28px;
                  border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          Comprar no AliExpress
        </a>
        <p style="margin-top:8px;font-size:12px;color:#9ca3af;">
          Use este link para ganhar comissão de afiliado
        </p>
      </div>

      <p style="font-size:12px;color:#9ca3af;">
        Após comprar, insira o código de rastreamento em
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${order.id}">Admin → Pedidos</a>
      </p>
    </div>
  `;

  try {
    await fetch(`https://${smtpHost}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${smtpPass}`,
      },
      body: JSON.stringify({
        from: smtpFrom,
        to: [admin.email],
        subject: `[COMPRAR] Pedido #${order.orderNumber} — ${aeItems.length} item(s)`,
        html,
      }),
    });
  } catch (error) {
    console.error("[Dropship] Erro ao enviar email ao admin:", error);
  }
}

/**
 * Atualiza o status do pedido dropship após compra no AliExpress.
 */
export async function markAsPurchased(
  orderId: string,
  aliexpressOrderId?: string,
): Promise<void> {
  await prisma.orderDropshipInfo.update({
    where: { orderId },
    data: {
      aliexpressStatus: "purchased",
      purchasedAt: new Date(),
    },
  });

  if (aliexpressOrderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        aliexpressOrderId,
        status: "PROCESSING",
      },
    });

    await prisma.orderHistory.create({
      data: {
        orderId,
        status: "PROCESSING",
        note: `Compra realizada no AliExpress. ID: ${aliexpressOrderId}`,
      },
    });
  }
}

/**
 * Atualiza o código de rastreamento de um pedido.
 */
export async function updateTrackingCode(
  orderId: string,
  trackingCode: string,
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingCode,
      status: "SHIPPED",
    },
  });

  await prisma.orderHistory.create({
    data: {
      orderId,
      status: "SHIPPED",
      note: `Código de rastreamento adicionado: ${trackingCode}`,
    },
  });

  // Notificar cliente
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  if (order) {
    const { sendShippingNotificationEmail } = await import("@/lib/email");
    await sendShippingNotificationEmail({
      to: order.user.email,
      customerName: order.user.name,
      orderNumber: order.orderNumber,
      trackingCode,
    });
  }
}
