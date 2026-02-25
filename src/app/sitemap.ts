import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fofurinhasbaby.vercel.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    // Product pages
    const products = await prisma.product.findMany({
      where: { isActive: true, isDraft: false },
      select: { slug: true, updatedAt: true },
    });

    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Category pages
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${baseUrl}/products?category=${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...productPages, ...categoryPages];
  } catch {
    return staticPages;
  }
}
