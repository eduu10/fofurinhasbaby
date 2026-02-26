import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { allArticles } from "@/lib/blog";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Static article: id starts with "static-"
    if (id.startsWith("static-")) {
      const numericId = parseInt(id.replace("static-", ""), 10);
      const article = allArticles.find((a) => a.id === numericId);

      if (!article) {
        return errorResponse("Artigo não encontrado", 404);
      }

      return successResponse({
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
        source: "static",
      });
    }

    // Database article
    const post = await prisma.blogPost.findUnique({ where: { id } });

    if (!post) {
      return errorResponse("Post não encontrado", 404);
    }

    return successResponse({ ...post, source: "database" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin get blog post error:", error);
    return errorResponse("Erro ao buscar post do blog", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Static articles cannot be updated via this endpoint
    if (id.startsWith("static-")) {
      return errorResponse("Artigos estáticos não podem ser editados", 400);
    }

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return errorResponse("Post não encontrado", 404);
    }

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

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return errorResponse("Categoria inválida", 400);
    }

    // Handle slug update when title changes
    let newSlug = post.slug;
    if (title && title.trim() !== post.title) {
      newSlug = slugify(title.trim());
      const existingSlug = await prisma.blogPost.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        title: title != null ? title.trim() : undefined,
        slug: newSlug,
        excerpt: excerpt != null ? excerpt.trim() : undefined,
        content: content != null ? content.trim() : undefined,
        category: category ?? undefined,
        tags: Array.isArray(tags) ? tags : undefined,
        coverImage: coverImage !== undefined ? (coverImage || null) : undefined,
        author: author != null ? author : undefined,
        readTime:
          readTime != null && !isNaN(Number(readTime))
            ? Number(readTime)
            : undefined,
        metaTitle: metaTitle !== undefined ? (metaTitle || null) : undefined,
        metaDescription:
          metaDescription !== undefined
            ? (metaDescription || null)
            : undefined,
        relatedProducts: Array.isArray(relatedProducts)
          ? relatedProducts
          : undefined,
        isPublished: isPublished ?? undefined,
        publishedAt:
          publishedAt !== undefined ? new Date(publishedAt) : undefined,
      },
    });

    return successResponse({ ...updated, source: "database" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin update blog post error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Erro ao atualizar post do blog";
    return errorResponse(errorMsg, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Static articles cannot be deleted
    if (id.startsWith("static-")) {
      return errorResponse("Artigos estáticos não podem ser excluídos", 400);
    }

    const post = await prisma.blogPost.findUnique({ where: { id } });

    if (!post) {
      return errorResponse("Post não encontrado", 404);
    }

    await prisma.blogPost.delete({ where: { id } });

    return successResponse({ message: "Post excluído com sucesso" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Não autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin delete blog post error:", error);
    return errorResponse("Erro ao excluir post do blog", 500);
  }
}
