import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";

/**
 * Simulated AliExpress product scraper.
 * In production, this would use a real scraper or API.
 * This mock generates realistic product data based on the URL.
 */
function simulateAliExpressScrape(url: string) {
  // Extract a pseudo product ID from the URL
  const idMatch = url.match(/\/(\d+)\.html/) || url.match(/item\/(\d+)/);
  const aliexpressId = idMatch ? idMatch[1] : String(Date.now());

  // Generate mock product data based on common baby/kids product patterns
  const productNames = [
    "Conjunto Infantil Algodão Premium",
    "Body Bebê Manga Longa Estampado",
    "Vestido Infantil Festa Princesa",
    "Macacão Bebê Recém-Nascido Soft",
    "Kit Babador Bandana Algodão 5 Peças",
    "Sapatinho Bebê Primeiro Passo",
    "Chapéu Bucket Infantil UV Protection",
    "Pijama Infantil Flanelado Inverno",
  ];

  const descriptions = [
    "Produto de alta qualidade, feito com materiais seguros para bebês. Tecido macio e confortável, ideal para o dia a dia. Disponível em diversas cores e tamanhos.",
    "Material premium, antialérgico e respirável. Design moderno e funcional. Perfeito para presente ou uso diário. Fácil de lavar e secar.",
    "Confeccionado em tecido 100% algodão, macio ao toque. Costuras reforçadas para maior durabilidade. Estampas exclusivas e cores vibrantes.",
  ];

  const colors = ["Rosa", "Azul", "Branco", "Amarelo", "Verde", "Lilás"];
  const sizes = ["P", "M", "G", "GG", "0-3M", "3-6M", "6-12M", "12-18M"];

  const randomName = productNames[Math.floor(Math.random() * productNames.length)];
  const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];

  // Generate a cost price between R$15 and R$60
  const costPrice = parseFloat((Math.random() * 45 + 15).toFixed(2));

  // Generate 3-5 images with placeholder URLs
  const imageCount = Math.floor(Math.random() * 3) + 3;
  const images = Array.from({ length: imageCount }, (_, i) => ({
    url: `https://placehold.co/800x800/FFB6C1/333333?text=Produto+${aliexpressId}+Img${i + 1}`,
    alt: `${randomName} - Imagem ${i + 1}`,
  }));

  // Generate 2-4 color variations
  const selectedColors = colors
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 3) + 2);

  // Generate 3-4 size variations
  const selectedSizes = sizes
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 2) + 3);

  const variations: { name: string; value: string; stock: number }[] = [];

  for (const color of selectedColors) {
    variations.push({
      name: "Cor",
      value: color,
      stock: Math.floor(Math.random() * 50) + 10,
    });
  }

  for (const size of selectedSizes) {
    variations.push({
      name: "Tamanho",
      value: size,
      stock: Math.floor(Math.random() * 50) + 10,
    });
  }

  const totalStock = variations.reduce((sum, v) => sum + v.stock, 0);

  return {
    aliexpressId,
    title: randomName,
    description: randomDescription,
    shortDescription: randomDescription.substring(0, 150) + "...",
    costPrice,
    images,
    variations,
    stock: totalStock,
    weight: parseFloat((Math.random() * 0.5 + 0.1).toFixed(3)),
    width: parseFloat((Math.random() * 20 + 10).toFixed(2)),
    height: parseFloat((Math.random() * 10 + 5).toFixed(2)),
    length: parseFloat((Math.random() * 25 + 15).toFixed(2)),
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { url, profitMargin: customMargin, categoryId } = body;

    if (!url) {
      return errorResponse("URL do AliExpress é obrigatória", 400);
    }

    if (!url.includes("aliexpress") && !url.includes("ali")) {
      return errorResponse("URL inválida. Forneça uma URL do AliExpress", 400);
    }

    const profitMargin = customMargin || 40; // Default 40% margin

    // Simulate scraping the AliExpress product
    const scraped = simulateAliExpressScrape(url);

    // Calculate selling price with profit margin
    const sellingPrice = parseFloat(
      (scraped.costPrice * (1 + profitMargin / 100)).toFixed(2)
    );

    // Generate compare-at price (slightly higher to show "discount")
    const compareAtPrice = parseFloat(
      (sellingPrice * 1.3).toFixed(2)
    );

    // Create slug
    let slug = slugify(scraped.title);
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = await prisma.product.create({
      data: {
        title: scraped.title,
        slug,
        description: scraped.description,
        shortDescription: scraped.shortDescription,
        price: sellingPrice,
        compareAtPrice,
        costPrice: scraped.costPrice,
        stock: scraped.stock,
        isActive: false,
        isDraft: true,
        categoryId: categoryId || null,
        aliexpressUrl: url,
        aliexpressId: scraped.aliexpressId,
        profitMargin,
        weight: scraped.weight,
        width: scraped.width,
        height: scraped.height,
        length: scraped.length,
        images: {
          create: scraped.images.map((img, index) => ({
            url: img.url,
            alt: img.alt,
            sortOrder: index,
          })),
        },
        variations: {
          create: scraped.variations.map((v) => ({
            name: v.name,
            value: v.value,
            stock: v.stock,
          })),
        },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variations: true,
        category: true,
      },
    });

    return successResponse(
      {
        product,
        importInfo: {
          sourceUrl: url,
          aliexpressId: scraped.aliexpressId,
          costPrice: scraped.costPrice,
          sellingPrice,
          profitMargin,
          message: "Produto importado como rascunho. Revise e ative quando pronto.",
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Import product error:", error);
    return errorResponse("Erro ao importar produto", 500);
  }
}
