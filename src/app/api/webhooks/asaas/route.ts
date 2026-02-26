import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapAsaasStatusToOrder } from "@/lib/asaas";
import type { PaymentStatus } from "@/lib/asaas";
import { sendOrderStatusEmail } from "@/lib/email";

const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";

export async function POST(request: NextRequest) {
  try {
    // Validate webhook token if configured
    if (WEBHOOK_TOKEN) {
      const token = request.headers.get("asaas-access-token");
      if (token !== WEBHOOK_TOKEN) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { event, payment } = body;

    if (!event || !payment) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(`[Asaas Webhook] Event: ${event}, Payment: ${payment.id}, Status: ${payment.status}`);

    // Find order by Asaas payment ID
    const order = await prisma.order.findFirst({
      where: { paymentId: payment.id },
      include: { user: true },
    });

    if (!order) {
      // Try finding by external reference (order ID)
      if (payment.externalReference) {
        const orderByRef = await prisma.order.findUnique({
          where: { id: payment.externalReference },
          include: { user: true },
        });
        if (!orderByRef) {
          console.log(`[Asaas Webhook] Order not found for payment ${payment.id}`);
          return NextResponse.json({ received: true });
        }
        await processPaymentUpdate(orderByRef, payment);
      }
      return NextResponse.json({ received: true });
    }

    await processPaymentUpdate(order, payment);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Asaas Webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

interface OrderWithUser {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  user: { id: string; name: string; email: string };
}

async function processPaymentUpdate(
  order: OrderWithUser,
  payment: { id: string; status: PaymentStatus; billingType: string }
) {
  const newOrderStatus = mapAsaasStatusToOrder(payment.status);

  // Only update if status actually changed
  if (order.paymentStatus === payment.status) return;

  const statusLabels: Record<string, string> = {
    PAID: "Pago",
    CANCELLED: "Cancelado",
    PENDING: "Pendente",
  };

  const statusMessages: Record<string, string> = {
    PAID: "Seu pagamento foi confirmado! Estamos preparando seu pedido.",
    CANCELLED: "Infelizmente seu pagamento foi cancelado ou estornado.",
    PENDING: "Seu pagamento ainda esta sendo processado.",
  };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: payment.status,
      status: newOrderStatus,
    },
  });

  await prisma.orderHistory.create({
    data: {
      orderId: order.id,
      status: newOrderStatus,
      note: `Asaas: ${payment.status} (${payment.billingType})`,
    },
  });

  // Send email notification for status changes
  if (newOrderStatus !== "PENDING") {
    sendOrderStatusEmail({
      to: order.user.email,
      customerName: order.user.name,
      orderNumber: order.orderNumber,
      status: newOrderStatus,
      statusLabel: statusLabels[newOrderStatus] || payment.status,
      message: statusMessages[newOrderStatus] || `Status atualizado: ${payment.status}`,
    }).catch((err) => console.error("[Email] Webhook notification failed:", err));
  }
}
