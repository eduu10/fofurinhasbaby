/**
 * Motor de Precificação Inteligente para Dropshipping BR
 *
 * Fórmula completa:
 * precoFinal = (custoProduto_USD × taxaCambio × (1 + impostos)) × margemLucro + frete_estimado
 *
 * Parâmetros configuráveis via env ou painel admin:
 * - MARKUP_MULTIPLIER (padrão: 2.5 = 150% de markup)
 * - IOF_RATE (padrão: 0.038 = 3,8%)
 * - IMPORT_TAX_RATE (padrão: 0.20 = 20% para produtos até USD 50)
 * - SHIPPING_ESTIMATE_BRL (padrão: 0 — frete grátis)
 */

// ---------------------------------------------------------------------------
// Configurações padrão
// ---------------------------------------------------------------------------

interface PricingConfig {
  markupMultiplier: number;
  iofRate: number;
  importTaxRate: number;
  shippingEstimateBRL: number;
}

function getDefaultConfig(): PricingConfig {
  return {
    markupMultiplier: parseFloat(process.env.MARKUP_MULTIPLIER ?? "2.5"),
    iofRate: parseFloat(process.env.IOF_RATE ?? "0.038"),
    importTaxRate: parseFloat(process.env.IMPORT_TAX_RATE ?? "0.20"),
    shippingEstimateBRL: parseFloat(process.env.SHIPPING_ESTIMATE_BRL ?? "0"),
  };
}

// ---------------------------------------------------------------------------
// Resultado do cálculo de preço
// ---------------------------------------------------------------------------

export interface PriceCalculation {
  /** Preço de custo em USD */
  costUSD: number;
  /** Taxa de câmbio utilizada */
  exchangeRate: number;
  /** Preço de custo convertido para BRL (sem impostos/margem) */
  costBRL: number;
  /** IOF aplicado em BRL */
  iofBRL: number;
  /** Imposto de importação aplicado em BRL */
  importTaxBRL: number;
  /** Custo total com impostos em BRL */
  totalCostBRL: number;
  /** Margem de lucro aplicada (multiplicador) */
  markupMultiplier: number;
  /** Frete estimado em BRL */
  shippingBRL: number;
  /** Preço final de venda em BRL (com arredondamento psicológico) */
  finalPrice: number;
  /** Preço final sem arredondamento psicológico */
  rawFinalPrice: number;
  /** Lucro estimado por unidade em BRL */
  profitBRL: number;
  /** Margem de lucro efetiva em percentual */
  profitMarginPercent: number;
}

// ---------------------------------------------------------------------------
// Funções principais
// ---------------------------------------------------------------------------

/**
 * Calcula o preço final de venda com a fórmula completa de dropshipping BR.
 * Inclui câmbio, IOF, imposto de importação, margem e arredondamento psicológico.
 */
export function calculateFinalPrice(
  costUSD: number,
  exchangeRate: number,
  overrides: Partial<PricingConfig> = {},
): PriceCalculation {
  const config = { ...getDefaultConfig(), ...overrides };

  // 1. Conversão USD → BRL
  const costBRL = costUSD * exchangeRate;

  // 2. IOF sobre a operação de câmbio (3,8%)
  const iofBRL = costBRL * config.iofRate;

  // 3. Imposto de importação (20% para produtos até USD 50 — Receita Federal 2024)
  //    Nota: Para USD > 50, a taxa pode ser diferente. Usar taxa configurável.
  const importTaxBRL = costBRL * config.importTaxRate;

  // 4. Custo total com impostos
  const totalCostBRL = costBRL + iofBRL + importTaxBRL;

  // 5. Aplicar margem de lucro (markup multiplier)
  const rawPriceWithMargin = totalCostBRL * config.markupMultiplier;

  // 6. Adicionar frete estimado
  const rawFinalPrice = rawPriceWithMargin + config.shippingEstimateBRL;

  // 7. Arredondamento psicológico: terminar em ,90 ou ,99
  const finalPrice = psychologicalRounding(rawFinalPrice);

  // 8. Calcular lucro e margem efetiva
  const profitBRL = finalPrice - totalCostBRL - config.shippingEstimateBRL;
  const profitMarginPercent = totalCostBRL > 0
    ? Math.round((profitBRL / totalCostBRL) * 10000) / 100
    : 0;

  return {
    costUSD,
    exchangeRate,
    costBRL: round2(costBRL),
    iofBRL: round2(iofBRL),
    importTaxBRL: round2(importTaxBRL),
    totalCostBRL: round2(totalCostBRL),
    markupMultiplier: config.markupMultiplier,
    shippingBRL: config.shippingEstimateBRL,
    finalPrice,
    rawFinalPrice: round2(rawFinalPrice),
    profitBRL: round2(profitBRL),
    profitMarginPercent,
  };
}

/**
 * Calcula o "preço de" (preço riscado) = preço_final × 1.3
 * Para mostrar desconto na página do produto.
 */
export function calculateCompareAtPrice(finalPrice: number): number {
  const raw = finalPrice * 1.3;
  return psychologicalRounding(raw);
}

/**
 * Calcula o preço mínimo de venda (breakeven) sem prejuízo.
 * Inclui todos os custos: câmbio, impostos e frete.
 */
export function calculateBreakeven(
  costUSD: number,
  exchangeRate: number,
  overrides: Partial<PricingConfig> = {},
): number {
  const config = { ...getDefaultConfig(), ...overrides };

  const costBRL = costUSD * exchangeRate;
  const iofBRL = costBRL * config.iofRate;
  const importTaxBRL = costBRL * config.importTaxRate;
  const totalCost = costBRL + iofBRL + importTaxBRL + config.shippingEstimateBRL;

  // Breakeven: custo total arredondado para cima
  return Math.ceil(totalCost * 100) / 100;
}

/**
 * Recalcula o preço de venda baseado em novo câmbio.
 * Usado pelo cron de sincronização diária.
 */
export function recalculatePrice(
  costUSD: number,
  newExchangeRate: number,
  markupMultiplier?: number,
): { newPrice: number; newCompareAt: number } {
  const calculation = calculateFinalPrice(costUSD, newExchangeRate, {
    markupMultiplier,
  });

  return {
    newPrice: calculation.finalPrice,
    newCompareAt: calculateCompareAtPrice(calculation.finalPrice),
  };
}

/**
 * Verifica se a margem de um produto ainda é aceitável (>= 40% padrão).
 * Retorna true se a margem está abaixo do mínimo.
 */
export function isMarginBelowMinimum(
  costUSD: number,
  currentPriceBRL: number,
  exchangeRate: number,
  minimumMarginPercent = 40,
): boolean {
  const costBRL = costUSD * exchangeRate;
  const config = getDefaultConfig();
  const totalCostBRL = costBRL * (1 + config.iofRate + config.importTaxRate);
  const profitBRL = currentPriceBRL - totalCostBRL;
  const marginPercent = totalCostBRL > 0 ? (profitBRL / totalCostBRL) * 100 : 0;
  return marginPercent < minimumMarginPercent;
}

/**
 * Calcula o valor de parcela (12x sem juros).
 */
export function calculateInstallment(price: number, installments = 12): number {
  return round2(price / installments);
}

/**
 * Calcula o preço com desconto PIX (5% OFF).
 */
export function calculatePixPrice(price: number, discountPercent = 5): number {
  return psychologicalRounding(price * (1 - discountPercent / 100));
}

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

/**
 * Arredondamento psicológico: preços terminam em ,90 ou ,99.
 * - Preços até R$ 30: terminar em ,90
 * - Preços acima de R$ 30: terminar em ,90 ou ,99 (o mais próximo)
 */
function psychologicalRounding(value: number): number {
  if (value <= 0) return 0;

  const intPart = Math.floor(value);
  const decPart = value - intPart;

  if (value <= 30) {
    // Para preços baixos, arredondar para ,90
    return decPart <= 0.9 ? intPart + 0.9 : intPart + 1 + 0.9;
  }

  // Para preços maiores, escolher entre ,90 e ,99
  const opt90 = intPart + 0.9;
  const opt99 = intPart + 0.99;

  // Se o valor bruto está mais perto de ,90 usa ,90; senão ,99
  if (decPart <= 0.45) {
    return opt90;
  } else if (decPart <= 0.95) {
    return opt99;
  } else {
    return intPart + 1 + 0.9;
  }
}

/** Arredonda para 2 casas decimais */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
