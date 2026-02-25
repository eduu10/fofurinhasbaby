"use client";

import { useMemo } from "react";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// --- Tipos ---

/** Representa uma variacao individual do produto */
export interface Variation {
  id: string;
  name: string;
  value: string;
  price?: number | null;
  stock: number;
  image?: string | null;
}

/** Props do componente de selecao de variantes */
interface VariantSelectorProps {
  /** Lista de variacoes disponiveis para o produto */
  variations: Variation[];
  /** Callback disparado ao selecionar uma variacao */
  onSelect: (variationId: string) => void;
  /** ID da variacao atualmente selecionada */
  selectedId: string | null;
}

// --- Constantes ---

/** Nomes de variantes que devem ser exibidas como swatches de cor */
const COLOR_VARIANT_NAMES = ["cor", "color", "colour", "cores"];

/** Limiar de estoque baixo para exibir aviso */
const LOW_STOCK_THRESHOLD = 5;

// --- Tipos auxiliares ---

/** Grupo de variacoes agrupadas pelo nome (ex: "Cor", "Tamanho") */
interface VariationGroup {
  name: string;
  items: Variation[];
}

// --- Funcoes auxiliares ---

/**
 * Agrupa variacoes pelo campo `name`.
 * Preserva a ordem de aparicao dos grupos.
 */
function groupVariationsByName(variations: Variation[]): VariationGroup[] {
  const groupMap = new Map<string, Variation[]>();

  for (const variation of variations) {
    const existing = groupMap.get(variation.name);
    if (existing) {
      existing.push(variation);
    } else {
      groupMap.set(variation.name, [variation]);
    }
  }

  return Array.from(groupMap.entries()).map(([name, items]) => ({
    name,
    items,
  }));
}

/**
 * Verifica se um grupo de variacoes representa cores
 * (baseado no nome normalizado do grupo).
 */
function isColorGroup(groupName: string): boolean {
  return COLOR_VARIANT_NAMES.includes(groupName.toLowerCase().trim());
}

/**
 * Calcula a diferenca de preco entre a variacao e o preco base do grupo.
 * Retorna null se nao houver diferenca ou se o preco nao estiver definido.
 */
function getPriceDifference(
  variation: Variation,
  groupItems: Variation[]
): number | null {
  if (variation.price == null) return null;

  // Preco base = menor preco valido do grupo
  const prices = groupItems
    .map((v) => v.price)
    .filter((p): p is number => p != null);

  if (prices.length === 0) return null;

  const basePrice = Math.min(...prices);
  const diff = variation.price - basePrice;

  // So exibir se houver diferenca positiva
  return diff > 0 ? diff : null;
}

// --- Subcomponentes ---

/**
 * Indicador de estoque baixo.
 * Exibido quando o estoque esta abaixo do limiar definido.
 */
function LowStockIndicator({ stock }: { stock: number }) {
  if (stock > LOW_STOCK_THRESHOLD || stock <= 0) return null;

  return (
    <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600 animate-pulse">
      <AlertTriangle size={12} className="shrink-0" />
      Apenas {stock} restantes!
    </span>
  );
}

/**
 * Swatch de cor - circulo com imagem ou pill colorido.
 * Usado para variacoes do tipo "Cor".
 */
function ColorSwatch({
  variation,
  isSelected,
  isDisabled,
  priceDiff,
  onSelect,
}: {
  variation: Variation;
  isSelected: boolean;
  isDisabled: boolean;
  priceDiff: number | null;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        disabled={isDisabled}
        title={
          isDisabled
            ? `${variation.value} - Esgotado`
            : variation.value
        }
        aria-label={`Selecionar cor: ${variation.value}`}
        aria-pressed={isSelected}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2",
          isSelected
            ? "border-pink-400 ring-2 ring-pink-300 ring-offset-1 shadow-md"
            : "border-gray-200 hover:border-pink-300 hover:shadow-sm",
          isDisabled && "cursor-not-allowed opacity-40"
        )}
      >
        {/* Conteudo do swatch: imagem ou pill colorido */}
        {variation.image ? (
          <div className="h-10 w-10 overflow-hidden rounded-full">
            <Image
              src={variation.image}
              alt={variation.value}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-gradient-to-br from-pink-100 to-pink-200",
              "text-[10px] font-bold text-pink-600"
            )}
          >
            {variation.value.slice(0, 3).toUpperCase()}
          </span>
        )}

        {/* Indicador de esgotado (risco diagonal) */}
        {isDisabled && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full">
            <div className="h-[2px] w-10 rotate-45 bg-red-400/70" />
          </div>
        )}
      </button>

      {/* Nome da cor */}
      <span
        className={cn(
          "max-w-[60px] truncate text-center text-[11px] font-medium",
          isSelected ? "text-pink-600 font-semibold" : "text-gray-500",
          isDisabled && "line-through text-gray-400"
        )}
      >
        {variation.value}
      </span>

      {/* Diferenca de preco */}
      {priceDiff != null && !isDisabled && (
        <span className="text-[10px] font-semibold text-pink-500">
          +{formatCurrency(priceDiff)}
        </span>
      )}

      {/* Indicador de estoque baixo */}
      <LowStockIndicator stock={variation.stock} />
    </div>
  );
}

/**
 * Botao retangular para variantes de tamanho e outras opcoes.
 * Formato de pill/botao com cantos arredondados.
 */
function SizeButton({
  variation,
  isSelected,
  isDisabled,
  priceDiff,
  onSelect,
}: {
  variation: Variation;
  isSelected: boolean;
  isDisabled: boolean;
  priceDiff: number | null;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onSelect}
        disabled={isDisabled}
        aria-label={`Selecionar ${variation.name}: ${variation.value}`}
        aria-pressed={isSelected}
        className={cn(
          "relative min-w-[56px] rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2",
          isSelected
            ? "border-pink-400 bg-pink-50 text-pink-700 shadow-md font-semibold"
            : "border-gray-200 bg-white text-gray-700 hover:border-pink-300 hover:bg-pink-50/50",
          isDisabled &&
            "cursor-not-allowed opacity-40 line-through decoration-red-400/60"
        )}
      >
        {variation.value}

        {/* Badge de diferenca de preco */}
        {priceDiff != null && !isDisabled && (
          <span className="ml-1.5 text-[10px] font-semibold text-pink-500">
            +{formatCurrency(priceDiff)}
          </span>
        )}
      </button>

      {/* Indicador de estoque baixo */}
      <LowStockIndicator stock={variation.stock} />
    </div>
  );
}

// --- Componente principal ---

/**
 * Seletor de variantes de produto.
 *
 * Agrupa as variacoes por nome (ex: "Cor", "Tamanho") e renderiza
 * o tipo de controle adequado:
 * - Swatches circulares para cores (com imagem ou pill)
 * - Botoes retangulares para tamanhos e outras opcoes
 *
 * Inclui indicadores visuais para:
 * - Variante selecionada (borda rosa)
 * - Estoque baixo (aviso animado)
 * - Esgotado (desabilitado com risco)
 * - Diferenca de preco em relacao ao preco base do grupo
 */
export function VariantSelector({
  variations,
  onSelect,
  selectedId,
}: VariantSelectorProps) {
  // Agrupar variacoes por nome, com memoizacao para evitar recalculo
  const groups = useMemo(
    () => groupVariationsByName(variations),
    [variations]
  );

  // Nao renderizar se nao houver variacoes
  if (variations.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const isColor = isColorGroup(group.name);

        return (
          <div key={group.name}>
            {/* Titulo do grupo */}
            <p className="mb-3 text-sm font-bold text-gray-700">
              {group.name}:
              {/* Exibir valor selecionado ao lado do titulo */}
              {selectedId && (
                <span className="ml-2 font-semibold text-pink-500">
                  {group.items.find((v) => v.id === selectedId)?.value ?? ""}
                </span>
              )}
            </p>

            {/* Lista de opcoes */}
            <div
              className={cn(
                "flex flex-wrap",
                isColor ? "gap-3" : "gap-2"
              )}
              role="radiogroup"
              aria-label={`Selecionar ${group.name}`}
            >
              {group.items.map((variation) => {
                const isSelected = variation.id === selectedId;
                const isDisabled = variation.stock === 0;
                const priceDiff = getPriceDifference(variation, group.items);

                return isColor ? (
                  <ColorSwatch
                    key={variation.id}
                    variation={variation}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    priceDiff={priceDiff}
                    onSelect={() => onSelect(variation.id)}
                  />
                ) : (
                  <SizeButton
                    key={variation.id}
                    variation={variation}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    priceDiff={priceDiff}
                    onSelect={() => onSelect(variation.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
