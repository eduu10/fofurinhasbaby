import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { orders: true } },
        },
      }),
      prisma.coupon.count(),
    ]);

    return successResponse({
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin list coupons error:", error);
    return errorResponse("Erro ao listar cupons", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { code, type, value, minPurchase, maxUses, expiresAt, isActive } = body;

    if (!code || !type || value === undefined) {
      return errorResponse("Código, tipo e valor são obrigatórios", 400);
    }

    if (!["FIXED", "PERCENTAGE"].includes(type)) {
      return errorResponse("Tipo deve ser FIXED ou PERCENTAGE", 400);
    }

    if (type === "PERCENTAGE" && (value < 0 || value > 100)) {
      return errorResponse("Porcentagem deve estar entre 0 e 100", 400);
    }

    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (existingCoupon) {
      return errorResponse("Já existe um cupom com este código", 409);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        type,
        value,
        minPurchase: minPurchase || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive ?? true,
      },
    });

    return successResponse(coupon, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin create coupon error:", error);
    return errorResponse("Erro ao criar cupom", 500);
  }
}
