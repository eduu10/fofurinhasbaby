/**
 * Serviço de email para notificações de pedidos.
 * Usa API HTTP (compatível com Resend, SendGrid, etc).
 * Se as variáveis de ambiente não estiverem configuradas, faz fallback para console.log.
 *
 * Variáveis de ambiente necessárias (Resend):
 * - SMTP_HOST (ex: api.resend.com)
 * - SMTP_PORT (não usado na API, mas mantido para compatibilidade)
 * - SMTP_USER (ex: resend)
 * - SMTP_PASS (ex: re_xxx - API key)
 * - SMTP_FROM (ex: "Fofurinhas Baby <noreply@fofurinhasbaby.com>")
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface OrderConfirmationData {
  to: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: { title: string; quantity: number; price: number }[];
}

interface OrderStatusData {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  message: string;
  trackingCode?: string;
  trackingUrl?: string;
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "Fofurinhas Baby <noreply@fofurinhasbaby.com>";

function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fofurinhasbaby.vercel.app";

function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FDFBF7;font-family:'Nunito',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#FF9EB5,#f472b6);padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-family:'Fredoka',Arial,sans-serif;font-size:28px;">
        Fofurinhas Baby
      </h1>
    </div>

    <!-- Content -->
    <div style="padding:32px 24px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">
        Fofurinhas Baby - Roupas e acessórios para seu bebê
      </p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        <a href="${baseUrl}" style="color:#f472b6;text-decoration:none;">Visitar loja</a> |
        <a href="${baseUrl}/account/orders" style="color:#f472b6;text-decoration:none;">Meus pedidos</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log(`[Email Preview] To: ${options.to} | Subject: ${options.subject}`);
    console.log(`[Email Preview] This email was not sent (SMTP not configured)`);
    return false;
  }

  try {
    // Usar Resend API (SMTP_HOST=resend, SMTP_PASS=api_key)
    // Ou qualquer serviço HTTP de email via fetch
    const res = await fetch(`https://${SMTP_HOST}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SMTP_PASS}`,
      },
      body: JSON.stringify({
        from: SMTP_FROM,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Email] API error (${res.status}):`, errorText);
      return false;
    }

    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${options.to}:`, error);
    return false;
  }
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<boolean> {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          ${item.title}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;">
          ${item.quantity}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
          ${formatCurrency(item.price * item.quantity)}
        </td>
      </tr>`,
    )
    .join("");

  const html = emailLayout(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;">
      Pedido confirmado! 🎉
    </h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">
      Olá <strong>${data.customerName}</strong>,<br>
      Seu pedido <strong>#${data.orderNumber}</strong> foi confirmado com sucesso!
    </p>

    <div style="background:#fdf2f8;border-radius:12px;padding:20px;margin:24px 0;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <thead>
          <tr style="border-bottom:2px solid #f9a8d4;">
            <th style="padding:8px 0;text-align:left;">Produto</th>
            <th style="padding:8px 0;text-align:center;">Qtd</th>
            <th style="padding:8px 0;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px 0;font-weight:bold;font-size:16px;">Total</td>
            <td style="padding:12px 0;text-align:right;font-weight:bold;font-size:16px;color:#ec4899;">
              ${formatCurrency(data.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p style="color:#6b7280;font-size:14px;">
      Acompanhe o status do seu pedido na sua
      <a href="${baseUrl}/account/orders" style="color:#ec4899;text-decoration:none;font-weight:600;">
        área do cliente
      </a>.
    </p>
  `);

  return sendEmail({
    to: data.to,
    subject: `Pedido #${data.orderNumber} confirmado - Fofurinhas Baby`,
    html,
  });
}

export async function sendOrderStatusEmail(data: OrderStatusData): Promise<boolean> {
  const statusColors: Record<string, string> = {
    PROCESSING: "#f59e0b",
    SHIPPED: "#3b82f6",
    DELIVERED: "#10b981",
    CANCELLED: "#ef4444",
  };

  const statusEmoji: Record<string, string> = {
    PROCESSING: "📦",
    SHIPPED: "🚚",
    DELIVERED: "✅",
    CANCELLED: "❌",
  };

  const color = statusColors[data.status] || "#6b7280";
  const emoji = statusEmoji[data.status] || "📋";

  let trackingHtml = "";
  if (data.trackingCode) {
    const trackingLink = data.trackingUrl
      ? `<a href="${data.trackingUrl}" style="color:#ec4899;text-decoration:none;font-weight:600;">Rastrear encomenda</a>`
      : `<a href="https://www.17track.net/pt/track?nums=${data.trackingCode}" style="color:#ec4899;text-decoration:none;font-weight:600;">Rastrear no 17track</a>`;

    trackingHtml = `
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1e40af;font-size:14px;">
          Código de rastreio:
        </p>
        <p style="margin:0 0 8px;font-family:monospace;font-size:16px;color:#1f2937;letter-spacing:1px;">
          ${data.trackingCode}
        </p>
        <p style="margin:0;">${trackingLink}</p>
      </div>
    `;
  }

  const html = emailLayout(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;">
      Atualização do pedido ${emoji}
    </h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">
      Olá <strong>${data.customerName}</strong>,<br>
      O status do seu pedido <strong>#${data.orderNumber}</strong> foi atualizado.
    </p>

    <div style="background:#f9fafb;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Novo status</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:${color};">
        ${data.statusLabel}
      </p>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">
        ${data.message}
      </p>
    </div>

    ${trackingHtml}

    <p style="color:#6b7280;font-size:14px;">
      Veja mais detalhes na sua
      <a href="${baseUrl}/account/orders" style="color:#ec4899;text-decoration:none;font-weight:600;">
        área do cliente
      </a>.
    </p>
  `);

  return sendEmail({
    to: data.to,
    subject: `Pedido #${data.orderNumber} - ${data.statusLabel} - Fofurinhas Baby`,
    html,
  });
}

export async function sendShippingNotificationEmail(data: {
  to: string;
  customerName: string;
  orderNumber: string;
  trackingCode: string;
  trackingUrl?: string;
  carrier?: string;
}): Promise<boolean> {
  return sendOrderStatusEmail({
    to: data.to,
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    status: "SHIPPED",
    statusLabel: "Enviado",
    message: data.carrier
      ? `Seu pedido foi enviado via ${data.carrier} e está a caminho!`
      : "Seu pedido foi enviado e está a caminho!",
    trackingCode: data.trackingCode,
    trackingUrl: data.trackingUrl,
  });
}
