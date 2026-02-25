import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createDropshippingOrder, isAliExpressConfigured } from "@/lib/aliexpress";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * POST /api/webhooks/stripe
 * Webhook do Stripe para processar eventos de pagamento.
 * Ao confirmar pagamento, atualiza pedido e envia ao AliExpress automaticamente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded": {
        await handlePaymentSuccess(event);
        break;
      }
      case "payment_intent.payment_failed": {
        await handlePaymentFailed(event);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handlePaymentSuccess(event: Stripe.Event) {
  let orderId: string | undefined;
  let paymentId: string | undefined;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    orderId = session.metadata?.orderId;
    paymentId = session.payment_intent as string;
  } else {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    orderId = paymentIntent.metadata?.orderId;
    paymentId = paymentIntent.id;
  }

  if (!orderId) {
    console.error("No orderId in payment metadata");
    return;
  }

  // Buscar pedido
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          product: {
            select: { aliexpressId: true, title: true },
          },
        },
      },
      address: true,
    },
  });

  if (!order) {
    console.error(`Order not found: ${orderId}`);
    return;
  }

  // Evitar processar duplicado
  if (order.status !== "PENDING") {
    console.log(`Order ${orderId} already processed (status: ${order.status})`);
    return;
  }

  // 1. Atualizar status para PAID
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentId,
      paymentStatus: "paid",
    },
  });

  await prisma.orderHistory.create({
    data: {
      orderId,
      status: "PAID",
      note: `Pagamento confirmado via Stripe (${paymentId})`,
    },
  });

  // 2. Enviar email de confirmação
  await sendOrderConfirmationEmail({
    to: order.user.email,
    customerName: order.user.name,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    items: order.items.map((item) => ({
      title: item.product.title,
      quantity: item.quantity,
      price: Number(item.price),
    })),
  });

  // 3. Auto-criar pedido no AliExpress
  if (!isAliExpressConfigured() || !order.address) return;

  const aeItems = order.items.filter((item) => item.product.aliexpressId);
  if (aeItems.length === 0) return;

  try {
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

    if (result) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          aliexpressOrderId: result.orderId,
          status: "PROCESSING",
        },
      });

      await prisma.orderHistory.create({
        data: {
          orderId,
          status: "PROCESSING",
          note: `Pedido enviado ao AliExpress automaticamente. ID: ${result.orderId}`,
        },
      });

      // Email notificando processamento
      await sendOrderStatusEmail({
        to: order.user.email,
        customerName: order.user.name,
        orderNumber: order.orderNumber,
        status: "PROCESSING",
        statusLabel: "Em processamento",
        message: "Seu pedido está sendo preparado pelo fornecedor.",
      });
    }
  } catch (error) {
    console.error(`Failed to auto-create AE order for ${orderId}:`, error);
    // Pedido continua como PAID - admin pode enviar manualmente
  }
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "failed" },
  });

  await prisma.orderHistory.create({
    data: {
      orderId,
      status: "PENDING",
      note: `Pagamento falhou (${paymentIntent.last_payment_error?.message || "erro desconhecido"})`,
    },
  });
}
