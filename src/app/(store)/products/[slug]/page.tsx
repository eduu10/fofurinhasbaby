import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetail } from "@/components/product/product-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fofurinhasbaby.vercel.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        title: true,
        metaTitle: true,
        metaDescription: true,
        shortDescription: true,
        description: true,
        price: true,
        compareAtPrice: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    if (!product) return { title: "Produto não encontrado" };

    const title = product.metaTitle || `${product.title} | Frete Grátis | Fofurinhas Baby`;
    const description = product.metaDescription
      || product.shortDescription
      || (product.description ? product.description.substring(0, 155) : `Compre ${product.title} na Fofurinhas Baby com frete grátis`);
    const imageUrl = product.images[0]?.url || `${BASE_URL}/og-image.png`;
    const productUrl = `${BASE_URL}/products/${slug}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: productUrl,
        siteName: "Fofurinhas Baby",
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 800,
            alt: product.title,
          },
        ],
        locale: "pt_BR",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: productUrl,
      },
      other: {
        "product:price:amount": String(product.price),
        "product:price:currency": "BRL",
      },
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

    // Schema.org Product markup para Google Shopping
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.shortDescription || product.description || "",
      image: product.images.map((img) => img.url),
      sku: product.sku || product.id,
      brand: {
        "@type": "Brand",
        name: "Fofurinhas Baby",
      },
      offers: {
        "@type": "Offer",
        url: `${BASE_URL}/products/${slug}`,
        priceCurrency: "BRL",
        price: String(product.price),
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        availability: product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: "Fofurinhas Baby",
        },
      },
      ...(product.reviews.length > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1),
          reviewCount: product.reviews.length,
          bestRating: 5,
          worstRating: 1,
        },
        review: product.reviews.slice(0, 3).map((r) => ({
          "@type": "Review",
          author: {
            "@type": "Person",
            name: r.user.name,
          },
          reviewRating: {
            "@type": "Rating",
            ratingValue: r.rating,
          },
          datePublished: r.createdAt.toISOString(),
          ...(r.comment && { reviewBody: r.comment }),
        })),
      }),
    };

    // Dados extras para componentes otimizados (vendas AliExpress ÷ 30 como proxy diário)
    const productWithExtras = {
      ...JSON.parse(JSON.stringify(product)),
      dailySales: product.salesCount > 0 ? Math.max(1, Math.floor(product.salesCount / 30)) : null,
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductDetail
          product={productWithExtras}
          relatedProducts={JSON.parse(JSON.stringify(relatedProducts))}
        />
      </>
    );
  } catch {
    notFound();
  }
}
