"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  if (onPageChange) {
    return (
      <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="Paginacao">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Pagina anterior">
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Anterior</span>
        </button>
        {pages.map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-gray-400">...</span>
          ) : (
            <button key={page} onClick={() => onPageChange(page)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors", page === currentPage ? "bg-pink-600 text-white shadow-sm" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50")} aria-current={page === currentPage ? "page" : undefined}>
              {page}
            </button>
          )
        )}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Proxima pagina">
          <span className="mr-1 hidden sm:inline">Proxima</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    );
  }

  // Link-based pagination for server components
  return (
    <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="Paginacao">
      {currentPage > 1 ? (
        <Link href={buildHref(currentPage - 1)} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50" aria-label="Pagina anterior">
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Anterior</span>
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400 opacity-50 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Anterior</span>
        </span>
      )}
      {pages.map((page, idx) =>
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-gray-400">...</span>
        ) : (
          <Link key={page} href={buildHref(page)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors", page === currentPage ? "bg-pink-600 text-white shadow-sm" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50")} aria-current={page === currentPage ? "page" : undefined}>
            {page}
          </Link>
        )
      )}
      {currentPage < totalPages ? (
        <Link href={buildHref(currentPage + 1)} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50" aria-label="Proxima pagina">
          <span className="mr-1 hidden sm:inline">Proxima</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400 opacity-50 cursor-not-allowed">
          <span className="mr-1 hidden sm:inline">Proxima</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
