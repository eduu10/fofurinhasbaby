/**
 * POST /api/admin/import-aliexpress
 *
 * Rota de importação inteligente de produtos do AliExpress.
 * Aceita tanto URL de produto quanto keywords para busca em lote.
 *
 * Body (importar por URL):
 *   { mode: "url", url: string, profitMargin?: number, categoryId?: string }
 *
 * Body (buscar por keyword):
 *   { mode: "search", keyword: string, page?: number }
 *
 * Body (importar selecionados):
 *   { mode: "import-batch", products: HybridProductData[], profitMargin?: number, categoryId?: string }
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { getHybridClient } from "@/lib/aliexpress";
import { transformToProduct, findOrDetectCategory } from "@/lib/aliexpress/transformer";
import type { HybridProductData } from "@/lib/aliexpress/types";

// Regex para extrair product_id de uma URL do AliExpress
const ALIEXPRESS_ID_REGEX = /(?:item\/|item-)(\d+)/;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const mode = body.mode ?? "url";

    switch (mode) {
      case "url":
        return handleUrlImport(body);
      case "search":
        return handleSearch(body);
      case "import-batch":
        return handleBatchImport(body);
      default:
        return errorResponse("Modo inválido. Use: url, search ou import-batch", 400);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("[Import] Erro:", error);
    return errorResponse("Erro ao processar importação", 500);
  }
}

// ---------------------------------------------------------------------------
// Importar por URL
// ---------------------------------------------------------------------------

async function handleUrlImport(body: {
  url?: string;
  profitMargin?: number;
  categoryId?: string;
}) {
  const { url, profitMargin, categoryId } = body;

  if (!url) {
    return errorResponse("URL do AliExpress é obrigatória", 400);
  }

  // Extrair product_id da URL
  const idMatch = url.match(ALIEXPRESS_ID_REGEX);
  if (!idMatch) {
    return errorResponse("URL inválida. Forneça uma URL válida do AliExpress (ex: aliexpress.com/item/1234567890.html)", 400);
  }

  const productId = idMatch[1];
  const client = getHybridClient();

  // Buscar dados do produto via HybridClient (Omkar → ae_sdk → Cache)
  const productData = await client.getProduct(productId);

  if (!productData) {
    return errorResponse(`Não foi possível encontrar o produto ${productId}. Tente novamente.`, 404);
  }

  // Calcular markup a partir da margem percentual
  const markupMultiplier = profitMargin
    ? 1 + profitMargin / 100
    : parseFloat(process.env.MARKUP_MULTIPLIER ?? "2.5");

  // Detectar categoria se não fornecida
  const resolvedCategoryId = categoryId ?? await findOrDetectCategory(productData.title, prisma);

  // Transformar dados para schema Prisma
  const transformed = await transformToProduct(productData, {
    markupMultiplier,
    categoryId: resolvedCategoryId,
    maxImages: 5,
    rehostImages: true,
  });

  // Verificar slug único
  let finalSlug = transformed.data.slug as string;
  const existingSlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
  if (existingSlug) {
    finalSlug = `${finalSlug}-${Date.now()}`;
  }

  // Criar produto no banco
  const product = await prisma.product.create({
    data: {
      ...transformed.data,
      slug: finalSlug,
      images: {
        create: transformed.images,
      },
      variations: {
        create: transformed.variations.map((v) => ({
          name: v.name,
          value: v.value,
          stock: v.stock,
          sku: v.sku,
          image: v.image,
          price: v.price,
        })),
      },
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variations: true,
      category: true,
    },
  });

  // Gerar link de afiliado (monetização extra)
  const affiliateUrl = await client.generateAffiliateLink(productData.productUrl);
  if (affiliateUrl !== productData.productUrl) {
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateUrl },
    });
  }

  return successResponse({
    product,
    importInfo: {
      sourceUrl: url,
      aliexpressId: productId,
      costPriceUSD: transformed.meta.costPriceUSD,
      exchangeRate: transformed.meta.exchangeRate,
      source: transformed.meta.source,
      needsTranslation: transformed.meta.needsTranslation,
      affiliateUrl: affiliateUrl !== productData.productUrl ? affiliateUrl : null,
      message: "Produto importado como rascunho. Revise e ative quando pronto.",
    },
  }, 201);
}

// ---------------------------------------------------------------------------
// Buscar por keyword (preview antes de importar)
// ---------------------------------------------------------------------------

async function handleSearch(body: {
  keyword?: string;
  page?: number;
}) {
  const { keyword, page = 1 } = body;

  if (!keyword || keyword.trim().length < 2) {
    return errorResponse("Keyword deve ter pelo menos 2 caracteres", 400);
  }

  const client = getHybridClient();
  const results = await client.searchProducts(keyword.trim(), page);

  // Retornar uso da API para exibir no admin
  const apiUsage = await client.getApiUsageStats();

  return successResponse({
    products: results.items,
    total: results.total,
    page: results.page,
    source: results.source,
    apiUsage,
  });
}

// ---------------------------------------------------------------------------
// Importar lote de produtos selecionados
// ---------------------------------------------------------------------------

async function handleBatchImport(body: {
  products?: HybridProductData[];
  profitMargin?: number;
  categoryId?: string;
}) {
  const { products, profitMargin, categoryId } = body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return errorResponse("Lista de produtos vazia", 400);
  }

  if (products.length > 50) {
    return errorResponse("Máximo de 50 produtos por lote", 400);
  }

  const markupMultiplier = profitMargin
    ? 1 + profitMargin / 100
    : parseFloat(process.env.MARKUP_MULTIPLIER ?? "2.5");

  const results: { productId: string; title: string; status: string; dbId?: string }[] = [];

  for (const productData of products) {
    try {
      // Verificar se já foi importado
      const existing = await prisma.product.findFirst({
        where: { aliexpressProductId: productData.productId },
      });

      if (existing) {
        results.push({
          productId: productData.productId,
          title: productData.title,
          status: "already_exists",
          dbId: existing.id,
        });
        continue;
      }

      const resolvedCategoryId = categoryId ?? await findOrDetectCategory(productData.title, prisma);

      const transformed = await transformToProduct(productData, {
        markupMultiplier,
        categoryId: resolvedCategoryId,
        maxImages: 5,
        rehostImages: true,
      });

      // Garantir slug único
      let finalSlug = transformed.data.slug as string;
      const existingSlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
      if (existingSlug) {
        finalSlug = `${finalSlug}-${productData.productId}`;
      }

      const product = await prisma.product.create({
        data: {
          ...transformed.data,
          slug: finalSlug,
          images: {
            create: transformed.images,
          },
          variations: {
            create: transformed.variations.map((v) => ({
              name: v.name,
              value: v.value,
              stock: v.stock,
              sku: v.sku,
              image: v.image,
              price: v.price,
            })),
          },
        },
      });

      results.push({
        productId: productData.productId,
        title: productData.title,
        status: "imported",
        dbId: product.id,
      });
    } catch (error) {
      console.error(`[Import] Erro ao importar ${productData.productId}:`, error);
      results.push({
        productId: productData.productId,
        title: productData.title,
        status: "error",
      });
    }
  }

  const imported = results.filter((r) => r.status === "imported").length;
  const skipped = results.filter((r) => r.status === "already_exists").length;
  const errors = results.filter((r) => r.status === "error").length;

  return successResponse({
    results,
    summary: {
      total: products.length,
      imported,
      skipped,
      errors,
      message: `${imported} produto(s) importado(s), ${skipped} já existente(s), ${errors} erro(s)`,
    },
  }, 201);
}
