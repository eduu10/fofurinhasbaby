import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/webhooks/cart-abandon
 *
 * Cron job para detectar e enviar emails de recuperação de carrinho abandonado.
 * Executar via Vercel Cron ou manualmente.
 *
 * Fluxo:
 * 1. Buscar carrinhos com itens que não foram convertidos em pedido há mais de 1h
 * 2. Enviar email de recuperação com foto do produto e botão de retorno
 * 3. Após 24h sem conversão, enviar segundo email com cupom de 5% OFF
 * 4. Registrar taxa de recuperação
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

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Buscar carrinhos abandonados (atualizados há mais de 1h)
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lt: oneHourAgo },
        items: { some: {} },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                title: true,
                price: true,
                slug: true,
                images: { take: 1, orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
      },
      take: 50,
    });

    const results = {
      total: abandonedCarts.length,
      firstEmailSent: 0,
      secondEmailSent: 0,
      errors: 0,
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fofurinhasbaby.vercel.app";
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.log(`[Cart Abandon] ${abandonedCarts.length} carrinhos abandonados (Gmail não configurado)`);
      return NextResponse.json({ message: "Email not configured", ...results });
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    for (const cart of abandonedCarts) {
      try {
        // Verificar se o carrinho tem uma sessão associada a um usuário
        // O sessionId do cart pode ser um userId se o usuário está logado
        const user = await prisma.user.findFirst({
          where: {
            sessions: {
              some: { sessionToken: cart.sessionId },
            },
          },
          select: { email: true, name: true },
        });

        if (!user) continue; // Carrinho anônimo — não é possível enviar email

        // Verificar se já existe um pedido recente deste usuário (evitar email se já comprou)
        const recentOrder = await prisma.order.findFirst({
          where: {
            user: { email: user.email },
            createdAt: { gt: oneHourAgo },
          },
        });
        if (recentOrder) continue;

        const mainProduct = cart.items[0]?.product;
        if (!mainProduct) continue;

        const productImage = mainProduct.images[0]?.url || "";
        const productUrl = `${baseUrl}/products/${mainProduct.slug}`;
        const cartUrl = `${baseUrl}/cart`;

        // Determinar se é primeiro ou segundo email
        const isSecondEmail = cart.updatedAt < twentyFourHoursAgo;

        if (isSecondEmail) {
          // Segundo email: com cupom de 5% OFF
          const couponCode = "VOLTEI5";

          // Garantir que o cupom existe
          await prisma.coupon.upsert({
            where: { code: couponCode },
            update: {},
            create: {
              code: couponCode,
              type: "PERCENTAGE",
              value: 5,
              isActive: true,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });

          await transporter.sendMail({
            from: `"Fofurinhas Baby" <${gmailUser}>`,
            to: user.email,
            subject: `${user.name.split(" ")[0]}, seu ${mainProduct.title} está esperando + 5% OFF`,
            html: buildSecondEmail(user.name, mainProduct.title, productImage, cartUrl, couponCode),
          });

          results.secondEmailSent++;
        } else {
          // Primeiro email: lembrete sem cupom
          await transporter.sendMail({
            from: `"Fofurinhas Baby" <${gmailUser}>`,
            to: user.email,
            subject: `${user.name.split(" ")[0]}, você esqueceu algo no carrinho`,
            html: buildFirstEmail(user.name, mainProduct.title, productImage, cartUrl, productUrl),
          });

          results.firstEmailSent++;
        }
      } catch (error) {
        console.error("[Cart Abandon] Erro:", error);
        results.errors++;
      }
    }

    console.log(
      `[Cart Abandon] ${results.firstEmailSent} primeiro(s) email(s), ${results.secondEmailSent} segundo(s) email(s) enviado(s)`,
    );

    return NextResponse.json({ message: "Cart abandon check completed", ...results });
  } catch (error) {
    console.error("[Cart Abandon] Falha geral:", error);
    return NextResponse.json(
      { error: "Cart abandon check failed" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Templates de email
// ---------------------------------------------------------------------------

function buildFirstEmail(
  name: string,
  productTitle: string,
  productImage: string,
  cartUrl: string,
  productUrl: string,
): string {
  const firstName = name.split(" ")[0];
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <body style="margin:0;padding:0;background:#FDFBF7;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#FF9EB5,#f472b6);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:24px;">Fofurinhas Baby</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#1f2937;">Oi ${firstName}, você esqueceu algo!</h2>
        <p style="color:#6b7280;line-height:1.6;">
          Notamos que você deixou um produto incrível no seu carrinho.
          Não perca — ele pode esgotar rapidinho!
        </p>
        ${productImage ? `
        <div style="text-align:center;margin:24px 0;">
          <a href="${productUrl}">
            <img src="${productImage}" alt="${productTitle}"
                 style="max-width:200px;border-radius:12px;" />
          </a>
        </div>` : ""}
        <p style="text-align:center;font-weight:bold;color:#1f2937;font-size:16px;">
          ${productTitle}
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${cartUrl}"
             style="display:inline-block;background:#ec4899;color:#fff;padding:14px 32px;
                    border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
            Voltar ao carrinho
          </a>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

function buildSecondEmail(
  name: string,
  productTitle: string,
  productImage: string,
  cartUrl: string,
  couponCode: string,
): string {
  const firstName = name.split(" ")[0];
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <body style="margin:0;padding:0;background:#FDFBF7;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#FF9EB5,#f472b6);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:24px;">Fofurinhas Baby</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#1f2937;">Presente especial para você, ${firstName}!</h2>
        <p style="color:#6b7280;line-height:1.6;">
          Sabemos que você estava de olho nesse produto.
          Preparamos um cupom exclusivo de <strong>5% OFF</strong> para você finalizar sua compra!
        </p>
        ${productImage ? `
        <div style="text-align:center;margin:24px 0;">
          <img src="${productImage}" alt="${productTitle}"
               style="max-width:200px;border-radius:12px;" />
        </div>` : ""}
        <div style="background:#fdf2f8;border:2px dashed #f472b6;border-radius:12px;padding:16px;
                    text-align:center;margin:24px 0;">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;">Seu cupom exclusivo:</p>
          <p style="margin:0;font-size:28px;font-weight:bold;color:#ec4899;letter-spacing:3px;">
            ${couponCode}
          </p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${cartUrl}"
             style="display:inline-block;background:#ec4899;color:#fff;padding:14px 32px;
                    border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">
            Usar meu cupom agora
          </a>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:12px;">
          Cupom válido por 7 dias. Não cumulativo com outras promoções.
        </p>
      </div>
    </div>
  </body>
  </html>`;
}
