import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) {
      return errorResponse("Código do cupom é obrigatório", 400);
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return errorResponse("Cupom não encontrado", 404);
    }

    if (!coupon.isActive) {
      return errorResponse("Cupom inativo", 400);
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return errorResponse("Cupom expirado", 400);
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return errorResponse("Cupom esgotado", 400);
    }

    if (coupon.minPurchase && subtotal && subtotal < Number(coupon.minPurchase)) {
      return errorResponse(
        `Valor mínimo para este cupom: R$ ${Number(coupon.minPurchase).toFixed(2)}`,
        400
      );
    }

    let discountAmount = 0;
    if (subtotal) {
      if (coupon.type === "PERCENTAGE") {
        discountAmount = subtotal * (Number(coupon.value) / 100);
      } else {
        discountAmount = Math.min(Number(coupon.value), subtotal);
      }
    }

    return successResponse({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minPurchase: coupon.minPurchase ? Number(coupon.minPurchase) : null,
      },
      discountAmount,
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return errorResponse("Erro ao validar cupom", 500);
  }
}
