import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";

/**
 * Mock shipping calculator.
 * In production, this would integrate with Correios, Melhor Envio, or another shipping API.
 * Returns simulated shipping options based on the ZIP code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zipCode, items } = body;

    if (!zipCode) {
      return errorResponse("CEP é obrigatório", 400);
    }

    const cleanZip = zipCode.replace(/\D/g, "");

    if (cleanZip.length !== 8) {
      return errorResponse("CEP inválido", 400);
    }

    // Simulate shipping calculation based on region (first digit of CEP)
    const region = parseInt(cleanZip[0]);

    // Base prices vary by region distance (simulating from SP origin)
    const regionMultipliers: Record<number, number> = {
      0: 1.2, // SP capital area
      1: 1.0, // SP interior
      2: 1.3, // RJ, ES
      3: 1.2, // MG
      4: 1.5, // BA, SE
      5: 1.4, // PE, AL, PB, RN
      6: 1.6, // CE, PI, MA, PA, AP, AM, AC, RR
      7: 1.5, // DF, GO, TO, MT, MS, RO
      8: 1.3, // PR, SC
      9: 1.4, // RS
    };

    const multiplier = regionMultipliers[region] || 1.3;

    // Calculate total weight from items (if provided)
    let totalWeight = 0.3; // Minimum weight in kg
    if (items && Array.isArray(items)) {
      totalWeight = Math.max(
        0.3,
        items.reduce((sum: number, item: { weight?: number; quantity?: number }) => {
          return sum + (item.weight || 0.2) * (item.quantity || 1);
        }, 0)
      );
    }

    // Add some randomness to make it realistic
    const randomFactor = 0.9 + Math.random() * 0.2;

    // Generate shipping options
    const basePricePac = (12 + totalWeight * 5) * multiplier * randomFactor;
    const basePriceSedex = (22 + totalWeight * 8) * multiplier * randomFactor;
    const basePriceMini = totalWeight <= 0.5 ? (8 + totalWeight * 3) * multiplier * randomFactor : null;

    // Delivery days vary by region
    const baseDaysPac = 5 + region;
    const baseDaysSedex = 2 + Math.floor(region / 2);

    const options = [
      {
        service: "PAC",
        name: "PAC - Encomenda",
        price: parseFloat(basePricePac.toFixed(2)),
        deliveryDays: {
          min: baseDaysPac,
          max: baseDaysPac + 3,
        },
        description: `Entrega em ${baseDaysPac} a ${baseDaysPac + 3} dias úteis`,
      },
      {
        service: "SEDEX",
        name: "SEDEX",
        price: parseFloat(basePriceSedex.toFixed(2)),
        deliveryDays: {
          min: baseDaysSedex,
          max: baseDaysSedex + 2,
        },
        description: `Entrega em ${baseDaysSedex} a ${baseDaysSedex + 2} dias úteis`,
      },
    ];

    if (basePriceMini !== null) {
      options.unshift({
        service: "MINI",
        name: "Mini Envios",
        price: parseFloat(basePriceMini.toFixed(2)),
        deliveryDays: {
          min: baseDaysPac + 2,
          max: baseDaysPac + 5,
        },
        description: `Entrega em ${baseDaysPac + 2} a ${baseDaysPac + 5} dias úteis`,
      });
    }

    // Free shipping for orders above R$150 (PAC only)
    const freeShippingThreshold = 150;
    if (items) {
      const totalValue = items.reduce(
        (sum: number, item: { price?: number; quantity?: number }) =>
          sum + (item.price || 0) * (item.quantity || 1),
        0
      );

      if (totalValue >= freeShippingThreshold) {
        options.push({
          service: "FREE",
          name: "Frete Grátis",
          price: 0,
          deliveryDays: {
            min: baseDaysPac,
            max: baseDaysPac + 5,
          },
          description: `Frete grátis - Entrega em ${baseDaysPac} a ${baseDaysPac + 5} dias úteis`,
        });
      }
    }

    return successResponse({
      zipCode: cleanZip,
      options: options.sort((a, b) => a.price - b.price),
    });
  } catch (error) {
    console.error("Calculate shipping error:", error);
    return errorResponse("Erro ao calcular frete", 500);
  }
}
