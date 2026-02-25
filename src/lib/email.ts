/**
 * Serviço de email para notificações de pedidos.
 * Usa nodemailer com Gmail (App Password).
 *
 * Variáveis de ambiente necessárias:
 * - GMAIL_USER   → fofurinhasbaby365@gmail.com
 * - GMAIL_PASS   → senha de app gerada no Google (16 chars, sem espaços)
 *
 * Como gerar a senha de app:
 * 1. Acesse myaccount.google.com → Segurança → Verificação em 2 etapas (ativar)
 * 2. Volte em Segurança → "Senhas de app"
 * 3. Selecione "Outro" → nomeie "Fofurinhas Baby" → Gerar
 * 4. Cole a senha de 16 caracteres em GMAIL_PASS
 */

import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fofurinhasbaby.vercel.app";

function isEmailConfigured(): boolean {
  return !!(GMAIL_USER && GMAIL_PASS);
}

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

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
    console.log(`[Email Preview] Para: ${options.to} | Assunto: ${options.subject}`);
    console.log(`[Email Preview] Configure GMAIL_USER e GMAIL_PASS no .env para enviar e-mails.`);
    return false;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Fofurinhas Baby" <${GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`[Email] Enviado para ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Falhou ao enviar para ${options.to}:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface OrderConfirmationData {
  to: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: { title: string; quantity: number; price: number }[];
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<boolean> {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">${item.title}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
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

export async function sendOrderCancelledEmail(data: {
  to: string;
  customerName: string;
  orderNumber: string;
  reason?: string;
}): Promise<boolean> {
  return sendOrderStatusEmail({
    to: data.to,
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    status: "CANCELLED",
    statusLabel: "Cancelado",
    message: data.reason
      ? `Seu pedido foi cancelado. Motivo: ${data.reason}`
      : "Seu pedido foi cancelado. Entre em contato conosco se tiver dúvidas.",
  });
}

export async function sendAdminNewOrderEmail(data: {
  adminEmail: string;
  customerName: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  items: { title: string; quantity: number; price: number }[];
}): Promise<boolean> {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">${item.title}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const paymentLabels: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão de crédito",
    boleto: "Boleto bancário",
  };

  const html = emailLayout(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;">
      Novo pedido recebido 🛍️
    </h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">
      Um novo pedido foi realizado por <strong>${data.customerName}</strong>.
    </p>

    <div style="background:#fdf2f8;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">
        Pedido: <strong style="color:#1f2937;">#${data.orderNumber}</strong> &nbsp;|&nbsp;
        Pagamento: <strong style="color:#1f2937;">${paymentLabels[data.paymentMethod] || data.paymentMethod}</strong>
      </p>
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
      <a href="${baseUrl}/admin/orders" style="background:#ec4899;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
        Ver pedido no painel admin
      </a>
    </p>
  `);

  return sendEmail({
    to: data.adminEmail,
    subject: `[Admin] Novo pedido #${data.orderNumber} — ${formatCurrency(data.total)}`,
    html,
  });
}

// ===========================================================================
// BOAS-VINDAS — disparado no cadastro
// ===========================================================================

export async function sendWelcomeEmail(data: {
  to: string;
  customerName: string;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];

  const html = emailLayout(`
    <h2 style="margin:0 0 8px;color:#1f2937;font-size:24px;">
      Bem-vinda à Fofurinhas Baby! 🎀
    </h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.7;margin-bottom:20px;">
      Olá <strong>${firstName}</strong>, que alegria ter você aqui!<br>
      Sua conta foi criada com sucesso. Preparamos os produtos mais fofos para o seu bebê.
    </p>

    <div style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">Seu presente de boas-vindas:</p>
      <p style="margin:0 0 4px;font-size:32px;font-weight:bold;color:#ec4899;letter-spacing:4px;">BEMVINDO10</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">10% OFF na primeira compra acima de R$ 50</p>
    </div>

    <div style="margin:28px 0;">
      <p style="margin:0 0 12px;font-weight:bold;color:#1f2937;font-size:15px;">O que você pode fazer agora:</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#4b5563;font-size:14px;">🛍️</td>
          <td style="padding:8px 0;color:#4b5563;font-size:14px;">
            <a href="${baseUrl}/products" style="color:#ec4899;text-decoration:none;font-weight:600;">Explorar a loja</a>
            — centenas de produtos para bebê
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4b5563;font-size:14px;">❤️</td>
          <td style="padding:8px 0;color:#4b5563;font-size:14px;">
            <a href="${baseUrl}/account/favorites" style="color:#ec4899;text-decoration:none;font-weight:600;">Salvar favoritos</a>
            — guarde o que você mais gostou
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4b5563;font-size:14px;">📦</td>
          <td style="padding:8px 0;color:#4b5563;font-size:14px;">
            <a href="${baseUrl}/account/orders" style="color:#ec4899;text-decoration:none;font-weight:600;">Acompanhar pedidos</a>
            — rastreie suas compras em tempo real
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${baseUrl}/products"
         style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f472b6);color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        Começar a explorar 💕
      </a>
    </div>
  `);

  return sendEmail({
    to: data.to,
    subject: `Bem-vinda à Fofurinhas Baby, ${firstName}! 🎀`,
    html,
  });
}

// ===========================================================================
// PROMOÇÃO / OFERTA ESPECIAL — disparado manualmente pelo admin
// ===========================================================================

export async function sendPromotionEmail(data: {
  to: string;
  customerName: string;
  title: string;
  description: string;
  couponCode?: string;
  discountText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  validUntil?: string;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];
  const ctaUrl = data.ctaUrl || `${baseUrl}/products`;
  const ctaLabel = data.ctaLabel || "Ver ofertas agora";

  const couponBlock = data.couponCode
    ? `
    <div style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:2px dashed #f472b6;
                border-radius:16px;padding:20px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Use o cupom:</p>
      <p style="margin:0 0 4px;font-size:30px;font-weight:bold;color:#ec4899;letter-spacing:4px;">
        ${data.couponCode}
      </p>
      ${data.discountText ? `<p style="margin:0;font-size:14px;color:#ec4899;font-weight:600;">${data.discountText}</p>` : ""}
      ${data.validUntil ? `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Válido até ${data.validUntil}</p>` : ""}
    </div>`
    : "";

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:8px;">
      <span style="background:#fce7f3;color:#ec4899;font-size:12px;font-weight:bold;
                   padding:4px 14px;border-radius:20px;letter-spacing:1px;">
        OFERTA ESPECIAL
      </span>
    </div>

    <h2 style="margin:16px 0 12px;color:#1f2937;font-size:24px;text-align:center;">
      ${data.title}
    </h2>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Olá <strong>${firstName}</strong>,<br>
      ${data.description}
    </p>

    ${couponBlock}

    <div style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f472b6);color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        ${ctaLabel} 🛍️
      </a>
    </div>

    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0;">
      Não cumulativo com outras promoções.
    </p>
  `);

  return sendEmail({
    to: data.to,
    subject: `${data.title} — Fofurinhas Baby`,
    html,
  });
}

// ===========================================================================
// URGÊNCIA / ESTOQUE BAIXO — "últimas unidades"
// ===========================================================================

export async function sendUrgencyEmail(data: {
  to: string;
  customerName: string;
  productTitle: string;
  productUrl: string;
  productImage?: string;
  stockLeft: number;
  price: number;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];

  const imageBlock = data.productImage
    ? `<div style="text-align:center;margin:20px 0;">
        <a href="${data.productUrl}">
          <img src="${data.productImage}" alt="${data.productTitle}"
               style="max-width:220px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />
        </a>
       </div>`
    : "";

  const html = emailLayout(`
    <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 12px 12px 0;
                padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;font-weight:bold;color:#c2410c;">
        ⚠️ Restam apenas ${data.stockLeft} unidade${data.stockLeft > 1 ? "s" : ""}!
      </p>
    </div>

    <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;">
      ${firstName}, não perca essa chance! ⏰
    </h2>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;">
      O produto que você visitou está quase esgotando.
      Garanta o seu antes que acabe!
    </p>

    ${imageBlock}

    <div style="background:#fdf2f8;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#1f2937;">
        ${data.productTitle}
      </p>
      <p style="margin:0;font-size:20px;font-weight:bold;color:#ec4899;">
        ${formatCurrency(data.price)}
      </p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${data.productUrl}"
         style="display:inline-block;background:#f97316;color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        Garantir agora antes que acabe!
      </a>
    </div>
  `);

  return sendEmail({
    to: data.to,
    subject: `⚠️ Últimas ${data.stockLeft} unidade${data.stockLeft > 1 ? "s" : ""}: ${data.productTitle}`,
    html,
  });
}

// ===========================================================================
// ANIVERSÁRIO DO BEBÊ — disparado na data especial
// ===========================================================================

export async function sendBabyBirthdayEmail(data: {
  to: string;
  customerName: string;
  babyName?: string;
  months?: number;
  couponCode?: string;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];
  const babyRef = data.babyName ? `do(a) ${data.babyName}` : "do seu bebê";
  const ageText = data.months
    ? data.months < 12
      ? `${data.months} mesversário`
      : `${Math.floor(data.months / 12)} aniversário`
    : "aniversário especial";

  const couponBlock = data.couponCode
    ? `
    <div style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:2px dashed #f472b6;
                border-radius:16px;padding:20px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Presente especial para você:</p>
      <p style="margin:0 0 4px;font-size:30px;font-weight:bold;color:#ec4899;letter-spacing:4px;">
        ${data.couponCode}
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Válido por 7 dias</p>
    </div>`
    : "";

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:48px;">🎂</span>
    </div>

    <h2 style="margin:0 0 12px;color:#1f2937;font-size:24px;text-align:center;">
      Feliz ${ageText} ${babyRef}!
    </h2>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Olá <strong>${firstName}</strong>,<br>
      Que data especial! Nós da Fofurinhas Baby queremos celebrar esse momento lindo com você. 💕
    </p>

    ${couponBlock}

    <div style="text-align:center;margin:28px 0;">
      <a href="${baseUrl}/products"
         style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f472b6);color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        Ver presentes especiais 🎁
      </a>
    </div>

    <p style="text-align:center;color:#9ca3af;font-size:13px;">
      Com todo carinho, equipe Fofurinhas Baby 🌸
    </p>
  `);

  return sendEmail({
    to: data.to,
    subject: `🎂 Feliz ${ageText} ${babyRef}! Um presente especial te espera`,
    html,
  });
}

// ===========================================================================
// NEWSLETTER / NOVIDADES — novos produtos ou conteúdo
// ===========================================================================

export async function sendNewsletterEmail(data: {
  to: string;
  customerName: string;
  subject: string;
  headline: string;
  body: string;
  products?: { title: string; price: number; url: string; image?: string }[];
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];

  const productsBlock =
    data.products && data.products.length > 0
      ? `
    <div style="margin:24px 0;">
      <p style="font-weight:bold;color:#1f2937;font-size:15px;margin:0 0 16px;">
        Produtos em destaque:
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${data.products
          .map(
            (p) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle;width:64px;">
            ${p.image ? `<img src="${p.image}" alt="${p.title}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;" />` : ""}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
            <a href="${p.url}" style="color:#1f2937;text-decoration:none;font-size:14px;font-weight:600;">
              ${p.title}
            </a>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:middle;white-space:nowrap;">
            <span style="color:#ec4899;font-weight:bold;font-size:15px;">${formatCurrency(p.price)}</span><br>
            <a href="${p.url}" style="color:#ec4899;font-size:12px;text-decoration:none;">Ver produto →</a>
          </td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>`
      : "";

  const html = emailLayout(`
    <p style="color:#9ca3af;font-size:13px;margin:0 0 16px;">
      Olá <strong style="color:#4b5563;">${firstName}</strong> 👋
    </p>

    <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;line-height:1.4;">
      ${data.headline}
    </h2>

    <div style="color:#4b5563;font-size:15px;line-height:1.7;margin-bottom:20px;">
      ${data.body}
    </div>

    ${productsBlock}

    ${
      data.ctaLabel
        ? `<div style="text-align:center;margin:28px 0;">
      <a href="${data.ctaUrl || baseUrl + "/products"}"
         style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f472b6);color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        ${data.ctaLabel}
      </a>
    </div>`
        : ""
    }
  `);

  return sendEmail({
    to: data.to,
    subject: data.subject,
    html,
  });
}

// ===========================================================================
// REATIVAÇÃO — cliente sem comprar há muito tempo
// ===========================================================================

export async function sendReactivationEmail(data: {
  to: string;
  customerName: string;
  daysSinceLastOrder: number;
  couponCode: string;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:40px;">💭</span>
    </div>

    <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;text-align:center;">
      Sentimos sua falta, ${firstName}!
    </h2>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Faz ${data.daysSinceLastOrder} dias desde sua última compra.<br>
      Preparamos uma surpresa especial para você voltar! 🎁
    </p>

    <div style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:2px dashed #f472b6;
                border-radius:16px;padding:24px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Seu cupom exclusivo:</p>
      <p style="margin:0 0 4px;font-size:32px;font-weight:bold;color:#ec4899;letter-spacing:4px;">
        ${data.couponCode}
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Válido por 5 dias · Não cumulativo</p>
    </div>

    <div style="margin:20px 0;">
      <p style="font-weight:bold;color:#1f2937;font-size:14px;margin:0 0 12px;text-align:center;">
        Novidades que chegaram enquanto você estava fora:
      </p>
      <div style="display:flex;gap:12px;justify-content:center;text-align:center;">
        <a href="${baseUrl}/products?category=roupas"
           style="flex:1;background:#fdf2f8;border-radius:12px;padding:16px 8px;
                  text-decoration:none;color:#1f2937;font-size:13px;font-weight:600;">
          👕<br>Roupas
        </a>
        <a href="${baseUrl}/products?category=brinquedos"
           style="flex:1;background:#fdf2f8;border-radius:12px;padding:16px 8px;
                  text-decoration:none;color:#1f2937;font-size:13px;font-weight:600;">
          🧸<br>Brinquedos
        </a>
        <a href="${baseUrl}/products?category=acessorios"
           style="flex:1;background:#fdf2f8;border-radius:12px;padding:16px 8px;
                  text-decoration:none;color:#1f2937;font-size:13px;font-weight:600;">
          🎀<br>Acessórios
        </a>
      </div>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${baseUrl}/products"
         style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f472b6);color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        Voltar a comprar 💕
      </a>
    </div>
  `);

  return sendEmail({
    to: data.to,
    subject: `${firstName}, sentimos sua falta! 🎁 Cupom especial para você`,
    html,
  });
}

// ===========================================================================
// AVALIAÇÃO PÓS-ENTREGA — pedir review após entrega
// ===========================================================================

export async function sendReviewRequestEmail(data: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: { title: string; url: string; image?: string }[];
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];

  const itemsBlock = data.items
    .map(
      (item) => `
    <div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #f3f4f6;">
      ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;margin-right:12px;" />` : ""}
      <div style="flex:1;">
        <p style="margin:0 0 6px;font-size:14px;color:#1f2937;font-weight:600;">${item.title}</p>
        <a href="${item.url}"
           style="display:inline-block;background:#fdf2f8;color:#ec4899;border:1px solid #f9a8d4;
                  padding:4px 14px;border-radius:20px;font-size:12px;text-decoration:none;font-weight:600;">
          ⭐ Avaliar produto
        </a>
      </div>
    </div>`,
    )
    .join("");

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:40px;">⭐</span>
    </div>

    <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;text-align:center;">
      O que você achou, ${firstName}?
    </h2>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Seu pedido <strong>#${data.orderNumber}</strong> foi entregue!<br>
      Sua opinião ajuda outras mamães a escolherem melhor. 💕
    </p>

    <div style="margin:24px 0;">
      ${itemsBlock}
    </div>

    <div style="background:#fdf2f8;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Avaliações verificadas ganham <strong style="color:#ec4899;">50 pontos</strong> no programa de fidelidade 🎁
      </p>
    </div>
  `);

  return sendEmail({
    to: data.to,
    subject: `Como foi seu pedido #${data.orderNumber}? Deixe sua avaliação ⭐`,
    html,
  });
}

// ===========================================================================
// FRETE GRÁTIS QUASE LÁ — cliente está perto do limite
// ===========================================================================

export async function sendFreeShippingNudgeEmail(data: {
  to: string;
  customerName: string;
  currentTotal: number;
  freeShippingThreshold: number;
}): Promise<boolean> {
  const firstName = data.customerName.split(" ")[0];
  const missing = data.freeShippingThreshold - data.currentTotal;

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:40px;">🚚</span>
    </div>

    <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;text-align:center;">
      Falta pouco para o frete grátis!
    </h2>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Olá <strong>${firstName}</strong>,<br>
      Você está a apenas <strong style="color:#ec4899;">${formatCurrency(missing)}</strong> do frete grátis!
    </p>

    <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;">
      <div style="background:#e5e7eb;border-radius:99px;height:12px;overflow:hidden;margin-bottom:8px;">
        <div style="background:linear-gradient(90deg,#ec4899,#f472b6);height:100%;width:${Math.min(95, Math.round((data.currentTotal / data.freeShippingThreshold) * 100))}%;border-radius:99px;"></div>
      </div>
      <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
        ${formatCurrency(data.currentTotal)} de ${formatCurrency(data.freeShippingThreshold)} para frete grátis
      </p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${baseUrl}/products"
         style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f472b6);color:#ffffff;
                padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
        Adicionar mais itens 🛍️
      </a>
    </div>
  `);

  return sendEmail({
    to: data.to,
    subject: `🚚 Falta só ${formatCurrency(missing)} para ganhar frete grátis!`,
    html,
  });
}

// ===========================================================================
// ADMIN — RESUMO DIÁRIO DE VENDAS
// ===========================================================================

export async function sendAdminDailySummaryEmail(data: {
  adminEmail: string;
  date: string;
  totalOrders: number;
  totalRevenue: number;
  newCustomers: number;
  pendingOrders: number;
  topProducts: { title: string; quantity: number }[];
}): Promise<boolean> {
  const topProductsHtml = data.topProducts
    .map(
      (p, i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">#${i + 1}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#1f2937;">${p.title}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;color:#ec4899;font-weight:bold;">${p.quantity} vendidos</td>
    </tr>`,
    )
    .join("");

  const html = emailLayout(`
    <h2 style="margin:0 0 4px;color:#1f2937;font-size:22px;">
      Resumo do dia 📊
    </h2>
    <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">${data.date}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 24px;">
      <div style="background:#fdf2f8;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:28px;font-weight:bold;color:#ec4899;">${data.totalOrders}</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">Pedidos hoje</p>
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:22px;font-weight:bold;color:#10b981;">${formatCurrency(data.totalRevenue)}</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">Receita hoje</p>
      </div>
      <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:28px;font-weight:bold;color:#3b82f6;">${data.newCustomers}</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">Novos clientes</p>
      </div>
      <div style="background:#fff7ed;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:28px;font-weight:bold;color:#f97316;">${data.pendingOrders}</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">Aguardando ação</p>
      </div>
    </div>

    ${
      data.topProducts.length > 0
        ? `
    <div style="margin:0 0 24px;">
      <p style="font-weight:bold;color:#1f2937;font-size:15px;margin:0 0 12px;">🏆 Mais vendidos hoje</p>
      <table style="width:100%;border-collapse:collapse;">
        ${topProductsHtml}
      </table>
    </div>`
        : ""
    }

    <div style="text-align:center;">
      <a href="${baseUrl}/admin"
         style="display:inline-block;background:#ec4899;color:#ffffff;padding:10px 24px;
                border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Abrir painel admin →
      </a>
    </div>
  `);

  return sendEmail({
    to: data.adminEmail,
    subject: `📊 Resumo do dia ${data.date} — ${data.totalOrders} pedido${data.totalOrders !== 1 ? "s" : ""} · ${formatCurrency(data.totalRevenue)}`,
    html,
  });
}
