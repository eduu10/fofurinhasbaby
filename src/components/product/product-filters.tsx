"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

interface ProductFiltersProps {
  categories?: SelectOption[];
  className?: string;
}

const sortOptions: SelectOption[] = [
  { value: "", label: "Ordenar por" },
  { value: "newest", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preco" },
  { value: "price_desc", label: "Maior preco" },
  { value: "name_asc", label: "A - Z" },
  { value: "name_desc", label: "Z - A" },
  { value: "bestsellers", label: "Mais vendidos" },
];

export function ProductFilters({
  categories = [],
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState(
    searchParams.get("category") || ""
  );
  const [minPrice, setMinPrice] = useState(
    searchParams.get("minPrice") || ""
  );
  const [maxPrice, setMaxPrice] = useState(
    searchParams.get("maxPrice") || ""
  );
  const [sort, setSort] = useState(searchParams.get("sort") || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();

    const search = searchParams.get("search");
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sort) params.set("sort", sort);

    params.set("page", "1");

    router.push(`/products?${params.toString()}`);
    setMobileOpen(false);
  }, [category, minPrice, maxPrice, sort, router, searchParams]);

  const clearFilters = useCallback(() => {
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setSort("");

    const search = searchParams.get("search");
    if (search) {
      router.push(`/products?search=${encodeURIComponent(search)}`);
    } else {
      router.push("/products");
    }
    setMobileOpen(false);
  }, [router, searchParams]);

  const hasFilters = category || minPrice || maxPrice || sort;

  const filtersContent = (
    <div className="space-y-5">
      {/* Category */}
      {categories.length > 0 && (
        <Select
          label="Categoria"
          options={categories}
          placeholder="Todas as categorias"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      )}

      {/* Price range */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Faixa de Preco (R$)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            min="0"
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            min="0"
          />
        </div>
      </div>

      {/* Sort */}
      <Select
        label="Ordenar"
        options={sortOptions}
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      />

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <Button onClick={applyFilters} className="w-full">
          Aplicar Filtros
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="w-full"
          >
            <X className="h-4 w-4" />
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile filter toggle */}
      <div className="mb-4 lg:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-[10px] text-white">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Mobile filters drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full overflow-y-auto bg-white p-6 shadow-xl lg:hidden">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filtersContent}
          </div>
        </>
      )}

      {/* Desktop filters sidebar */}
      <div className={cn("hidden lg:block", className)}>
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Filtros</h3>
        {filtersContent}
      </div>
    </>
  );
}
