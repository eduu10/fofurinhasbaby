import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { calculateShipping, isAliExpressConfigured } from "@/lib/aliexpress";

/**
 * POST /api/aliexpress/shipping
 * Calcula opções de frete para um produto.
 * Integra com ViaCEP para converter CEP em estado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity = 1, cep } = body;

    if (!productId) {
      return errorResponse("ID do produto é obrigatório", 400);
    }

    if (!cep) {
      return errorResponse("CEP é obrigatório", 400);
    }

    // Validar formato do CEP (8 dígitos)
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      return errorResponse("CEP inválido. Use 8 dígitos.", 400);
    }

    // Buscar endereço via ViaCEP
    let viaCepData: Record<string, string> | null = null;
    try {
      const viaCepRes = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
      );
      viaCepData = await viaCepRes.json();

      if (viaCepData && "erro" in viaCepData) {
        return errorResponse("CEP não encontrado", 404);
      }
    } catch {
      // Se ViaCEP falhar, continua com dados básicos
    }

    // Se AliExpress configurado, calcular frete real
    if (isAliExpressConfigured()) {
      const options = await calculateShipping(
        productId,
        quantity,
        "BR",
      );

      return successResponse({
        options,
        address: viaCepData
          ? {
              city: viaCepData.localidade,
              state: viaCepData.uf,
              neighborhood: viaCepData.bairro,
              street: viaCepData.logradouro,
            }
          : null,
      });
    }

    // Fallback: cálculo de frete simulado baseado na região
    const regionMultiplier = getRegionMultiplier(
      viaCepData?.uf ?? cleanCep.substring(0, 2),
    );

    const basePrice = 15.9;
    const perUnit = 3.5;
    const baseCost = basePrice + (quantity - 1) * perUnit;

    const options = [
      {
        serviceName: "Envio Padrão",
        trackingAvailable: true,
        estimatedDays: Math.round(25 * regionMultiplier),
        cost: Math.round(baseCost * regionMultiplier * 100) / 100,
        currency: "BRL",
      },
      {
        serviceName: "Envio Expresso",
        trackingAvailable: true,
        estimatedDays: Math.round(15 * regionMultiplier),
        cost: Math.round(baseCost * regionMultiplier * 1.8 * 100) / 100,
        currency: "BRL",
      },
    ];

    // Frete grátis para pedidos acima de R$150
    const totalEstimate = baseCost * regionMultiplier;
    if (totalEstimate > 0) {
      options.unshift({
        serviceName: "Frete Econômico",
        trackingAvailable: false,
        estimatedDays: Math.round(35 * regionMultiplier),
        cost: Math.max(0, Math.round((baseCost * regionMultiplier * 0.6) * 100) / 100),
        currency: "BRL",
      });
    }

    return successResponse({
      options,
      address: viaCepData
        ? {
            city: viaCepData.localidade,
            state: viaCepData.uf,
            neighborhood: viaCepData.bairro,
            street: viaCepData.logradouro,
          }
        : null,
    });
  } catch (error) {
    console.error("Shipping calculation error:", error);
    return errorResponse("Erro ao calcular frete", 500);
  }
}

function getRegionMultiplier(stateOrPrefix: string): number {
  const state = stateOrPrefix.toUpperCase();
  // Sudeste
  if (["SP", "RJ", "MG", "ES"].includes(state) || ["01", "02", "03", "04", "05", "06", "07", "08", "09", "1", "2", "3"].includes(stateOrPrefix)) return 1.0;
  // Sul
  if (["PR", "SC", "RS"].includes(state) || ["8", "9"].includes(stateOrPrefix.charAt(0))) return 1.1;
  // Centro-Oeste
  if (["GO", "MT", "MS", "DF"].includes(state) || ["7"].includes(stateOrPrefix.charAt(0))) return 1.2;
  // Nordeste
  if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(state) || ["4", "5", "6"].includes(stateOrPrefix.charAt(0))) return 1.3;
  // Norte
  return 1.5;
}
