import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { allArticles } from "@/lib/blog";
import type { Prisma } from "@prisma/client";

const VALID_CATEGORIES = [
  "gravidez",
  "recem-nascido",
  "amamentacao",
  "sono-do-bebe",
  "alimentacao",
  "desenvolvimento",
  "saude",
  "moda-infantil",
  "decoracao",
  "dicas-de-mae",
  "passeios",
  "seguranca",
  "sustentabilidade",
  "tecnologia",
  "educacao",
] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // all, published, draft
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { author: { contains: search } },
        { category: { contains: search } },
      ];
    }

    switch (status) {
      case "published":
        where.isPublished = true;
        break;
      case "draft":
        where.isPublished = false;
        break;
      // "all" or unset: no filter
    }

    const [dbPosts, dbTotal] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    // Map DB posts with source marker
    const dbPostsMapped = dbPosts.map((post) => ({
      ...post,
      source: "database" as const,
    }));

    // Map static articles with source marker
    let filteredStatic = allArticles.map((article) => ({
      id: `static-${article.id}`,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      tags: article.tags,
      coverImage: article.coverImage,
      author: article.author,
      readTime: article.readTime,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      relatedProducts: article.relatedProducts,
      isPublished: true,
      publishedAt: new Date(article.publishedAt),
      createdAt: new Date(article.publishedAt),
      updatedAt: new Date(article.publishedAt),
      source: "static" as const,
    }));

    // Apply search filter to static articles
    if (search) {
      const q = search.toLowerCase();
      filteredStatic = filteredStatic.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Apply status filter to static articles (all static are published)
    if (status === "draft") {
      filteredStatic = [];
    }

    // Merge and sort by publishedAt desc
    const merged = [...dbPostsMapped, ...filteredStatic].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // Total for pagination is DB total + filtered static count
    const total = dbTotal + filteredStatic.length;

    return successResponse({
      posts: merged,
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
    console.error("Admin list blog posts error:", error);
    return errorResponse("Erro ao listar posts do blog", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      title,
      excerpt,
      content,
      category,
      tags,
      coverImage,
      author,
      readTime,
      metaTitle,
      metaDescription,
      relatedProducts,
      isPublished,
      publishedAt,
    } = body;

    if (!title || !title.trim()) {
      return errorResponse("Título é obrigatório", 400);
    }

    if (!excerpt || !excerpt.trim()) {
      return errorResponse("Resumo é obrigatório", 400);
    }

    if (!content || !content.trim()) {
      return errorResponse("Conteúdo é obrigatório", 400);
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return errorResponse("Categoria inválida", 400);
    }

    // Generate slug from title
    let slug = slugify(title.trim());

    // Ensure slug uniqueness
    const existingSlug = await prisma.blogPost.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        category,
        tags: Array.isArray(tags) ? tags : [],
        coverImage: coverImage || null,
        author: author || "Equipe Fofurinhas Baby",
        readTime: readTime != null && !isNaN(Number(readTime)) ? Number(readTime) : 7,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        relatedProducts: Array.isArray(relatedProducts) ? relatedProducts : [],
        isPublished: isPublished ?? true,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
    });

    return successResponse(post, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin create blog post error:", error);
    return errorResponse("Erro ao criar post do blog", 500);
  }
}
