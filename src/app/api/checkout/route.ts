import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";
import {
  isAsaasConfigured,
  getOrCreateCustomer,
  createPayment,
  getPixQrCode,
  formatDueDate,
} from "@/lib/asaas";
import type { BillingType, CreditCardData, CreditCardHolderInfo } from "@/lib/asaas";
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!isAsaasConfigured()) {
      return errorResponse("Gateway de pagamento nao configurado", 500);
    }

    const body = await request.json();
    const {
      addressId,
      paymentMethod,
      cpf,
      items,
      couponCode,
      shipping: shippingInput,
      creditCard,
      creditCardHolderInfo,
      installmentCount,
    } = body;

    if (!addressId || !items?.length) {
      return errorResponse("Endereco e itens sao obrigatorios", 400);
    }
    if (!cpf) {
      return errorResponse("CPF e obrigatorio para pagamento", 400);
    }
    if (!paymentMethod || !["pix", "credit_card", "boleto"].includes(paymentMethod)) {
      return errorResponse("Forma de pagamento invalida", 400);
    }

    // Validate address
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: user.id },
    });
    if (!address) {
      return errorResponse("Endereco nao encontrado", 404);
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems: {
      productId: string;
      variationId: string | null;
      title: string;
      price: number;
      quantity: number;
      image: string | null;
    }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, isActive: true, isDraft: false },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variations: true,
        },
      });

      if (!product) {
        return errorResponse(`Produto ${item.productId} nao encontrado ou indisponivel`, 404);
      }

      let itemPrice = Number(product.price);
      let variationId = null;

      if (item.variationId) {
        const variation = product.variations.find((v) => v.id === item.variationId);
        if (!variation) {
          return errorResponse(`Variacao ${item.variationId} nao encontrada`, 404);
        }
        if (variation.price) itemPrice = Number(variation.price);
        variationId = variation.id;
      }

      const quantity = item.quantity || 1;
      subtotal += itemPrice * quantity;

      orderItems.push({
        productId: product.id,
        variationId,
        title: product.title,
        price: itemPrice,
        quantity,
        image: product.images[0]?.url || null,
      });
    }

    // Apply coupon
    let discount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          return errorResponse("Cupom expirado", 400);
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return errorResponse("Cupom esgotado", 400);
        }
        if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
          return errorResponse(
            `Valor minimo para este cupom: R$ ${Number(coupon.minPurchase).toFixed(2)}`,
            400
          );
        }
        if (coupon.type === "PERCENTAGE") {
          discount = subtotal * (Number(coupon.value) / 100);
        } else {
          discount = Number(coupon.value);
        }
        couponId = coupon.id;
      }
    }

    // Apply PIX discount (5%)
    let pixDiscount = 0;
    if (paymentMethod === "pix") {
      pixDiscount = subtotal * 0.05;
    }

    const shippingCost = shippingInput || 0;
    const total = Math.max(0, subtotal - discount - pixDiscount + shippingCost);

    // Map payment method to Asaas billing type
    const billingTypeMap: Record<string, BillingType> = {
      pix: "PIX",
      credit_card: "CREDIT_CARD",
      boleto: "BOLETO",
    };

    // Get or create Asaas customer
    const cpfClean = cpf.replace(/\D/g, "");
    const asaasCustomer = await getOrCreateCustomer({
      name: user.name,
      cpfCnpj: cpfClean,
      email: user.email,
      mobilePhone: user.phone?.replace(/\D/g, "") || undefined,
      postalCode: address.zipCode.replace(/\D/g, ""),
      address: address.street,
      addressNumber: address.number,
      complement: address.complement || undefined,
      province: address.neighborhood,
      externalReference: user.id,
    });

    // Create order in database
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          addressId,
          subtotal,
          shipping: shippingCost,
          discount: discount + pixDiscount,
          total,
          couponId,
          paymentMethod: paymentMethod,
          paymentStatus: "PENDING",
          items: {
            create: orderItems,
          },
          history: {
            create: {
              status: "PENDING",
              note: "Pedido criado - aguardando pagamento",
            },
          },
        },
        include: {
          items: true,
          history: true,
          address: true,
        },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            salesCount: { increment: item.quantity },
            stock: { decrement: item.quantity },
          },
        });
      }

      return newOrder;
    });

    // Create Asaas payment
    const paymentInput: Parameters<typeof createPayment>[0] = {
      customer: asaasCustomer.id,
      billingType: billingTypeMap[paymentMethod],
      value: total,
      dueDate: formatDueDate(),
      description: `Pedido #${orderNumber} - Fofurinhas Baby`,
      externalReference: order.id,
    };

    // Add credit card data if applicable
    if (paymentMethod === "credit_card" && creditCard) {
      paymentInput.creditCard = creditCard as CreditCardData;
      paymentInput.creditCardHolderInfo = (creditCardHolderInfo || {
        name: user.name,
        email: user.email,
        cpfCnpj: cpfClean,
        postalCode: address.zipCode.replace(/\D/g, ""),
        addressNumber: address.number,
        phone: user.phone?.replace(/\D/g, "") || "",
      }) as CreditCardHolderInfo;

      if (installmentCount && installmentCount > 1) {
        paymentInput.installmentCount = installmentCount;
        paymentInput.installmentValue = Number((total / installmentCount).toFixed(2));
      }

      // Get remote IP for anti-fraud
      const forwarded = request.headers.get("x-forwarded-for");
      paymentInput.remoteIp = forwarded?.split(",")[0]?.trim() || "127.0.0.1";
    }

    const asaasPayment = await createPayment(paymentInput);

    // Update order with payment ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: asaasPayment.id,
        paymentStatus: asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED"
          ? "PAID"
          : "PENDING",
        status: asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED"
          ? "PAID"
          : "PENDING",
      },
    });

    // If credit card was confirmed immediately, add history
    if (asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED") {
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          status: "PAID",
          note: "Pagamento confirmado via cartao de credito",
        },
      });
    }

    // Build response with payment info
    const response: Record<string, unknown> = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: asaasPayment.id,
      paymentStatus: asaasPayment.status,
      paymentMethod,
      total,
      invoiceUrl: asaasPayment.invoiceUrl,
    };

    // If PIX, get QR code
    if (paymentMethod === "pix") {
      try {
        const pixData = await getPixQrCode(asaasPayment.id);
        response.pix = {
          qrCodeImage: pixData.encodedImage,
          qrCodePayload: pixData.payload,
          expirationDate: pixData.expirationDate,
        };
      } catch (err) {
        console.error("[Asaas] Error getting PIX QR Code:", err);
      }
    }

    // If boleto, include URL
    if (paymentMethod === "boleto") {
      response.boleto = {
        bankSlipUrl: asaasPayment.bankSlipUrl,
      };
    }

    // If credit card, include brand info
    if (paymentMethod === "credit_card") {
      response.creditCard = {
        number: asaasPayment.creditCardNumber,
        brand: asaasPayment.creditCardBrand,
      };
    }

    // Send emails in background
    const emailItems = orderItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    }));

    sendOrderConfirmationEmail({
      to: user.email,
      customerName: user.name,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      items: emailItems,
    }).catch((err) => console.error("[Email] Confirmacao falhou:", err));

    prisma.user
      .findFirst({ where: { role: "ADMIN" }, select: { email: true } })
      .then((admin) => {
        if (admin) {
          sendAdminNewOrderEmail({
            adminEmail: admin.email,
            customerName: user.name,
            orderNumber: order.orderNumber,
            total: Number(order.total),
            paymentMethod,
            items: emailItems,
          }).catch((err) => console.error("[Email] Notificacao admin falhou:", err));
        }
      })
      .catch((err) => console.error("[Email] Busca admin falhou:", err));

    return successResponse(response, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Nao autenticado", 401);
    }
    console.error("Checkout error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Erro ao processar pagamento",
      500
    );
  }
}
