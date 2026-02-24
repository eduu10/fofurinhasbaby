import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetail } from "@/components/product/product-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { title: true, metaTitle: true, metaDescription: true, shortDescription: true },
    });

    if (!product) return { title: "Produto nao encontrado" };

    return {
      title: product.metaTitle || product.title,
      description: product.metaDescription || product.shortDescription || `Compre ${product.title} na Fofurinhas Baby`,
    };
  } catch {
    return { title: "Produto" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true, isDraft: false },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variations: true,
        category: true,
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) notFound();

    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isDraft: false,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      take: 4,
    });

    return (
      <ProductDetail
        product={JSON.parse(JSON.stringify(product))}
        relatedProducts={JSON.parse(JSON.stringify(relatedProducts))}
      />
    );
  } catch {
    notFound();
  }
}
