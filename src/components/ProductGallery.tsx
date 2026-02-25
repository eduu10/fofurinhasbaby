"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Tipos para as props do componente de galeria de produto
// ============================================================

/** Representa uma imagem individual da galeria */
interface GalleryImage {
  url: string;
  alt: string;
}

/** Props aceitas pelo componente ProductGallery */
interface ProductGalleryProps {
  /** Lista de imagens do produto */
  images: GalleryImage[];
  /** Titulo do produto (usado como fallback de alt e acessibilidade) */
  productTitle: string;
}

// ============================================================
// Constantes de configuracao
// ============================================================

/** Distancia minima em pixels para considerar um swipe valido */
const SWIPE_THRESHOLD = 50;

/** Fator de escala do zoom ao passar o mouse */
const ZOOM_SCALE = 2.2;

/** Duracao da transicao de fade em milissegundos */
const FADE_DURATION_MS = 300;

// ============================================================
// Componente principal: Galeria de imagens de produto
// ============================================================

export function ProductGallery({ images, productTitle }: ProductGalleryProps) {
  // Indice da imagem atualmente selecionada
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Estado de zoom (posicao do cursor para transformOrigin)
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Controle da transicao de fade entre imagens
  const [isFading, setIsFading] = useState<boolean>(false);
  const [displayIndex, setDisplayIndex] = useState<number>(0);

  // Referencia do container principal (para eventos de toque)
  const containerRef = useRef<HTMLDivElement>(null);

  // Referencia para armazenar posicao inicial do toque (swipe)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Referencia da strip de thumbnails para scroll automatico
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  // Garantir que o indice ativo nao exceda o array de imagens
  const safeIndex = Math.min(activeIndex, Math.max(0, images.length - 1));

  // ============================================================
  // Navegacao entre imagens
  // ============================================================

  /** Navega para uma imagem especifica com efeito de fade */
  const goToImage = useCallback(
    (index: number) => {
      if (index === activeIndex || images.length <= 1) return;

      // Inicia a transicao de fade-out
      setIsFading(true);

      // Apos o fade-out, troca a imagem e faz fade-in
      setTimeout(() => {
        setActiveIndex(index);
        setDisplayIndex(index);
        setIsFading(false);
      }, FADE_DURATION_MS);
    },
    [activeIndex, images.length]
  );

  /** Avanca para a proxima imagem (circular) */
  const goNext = useCallback(() => {
    const nextIndex = (safeIndex + 1) % images.length;
    goToImage(nextIndex);
  }, [safeIndex, images.length, goToImage]);

  /** Volta para a imagem anterior (circular) */
  const goPrev = useCallback(() => {
    const prevIndex = (safeIndex - 1 + images.length) % images.length;
    goToImage(prevIndex);
  }, [safeIndex, images.length, goToImage]);

  // Sincronizar displayIndex quando activeIndex muda diretamente
  useEffect(() => {
    setDisplayIndex(activeIndex);
  }, [activeIndex]);

  // ============================================================
  // Scroll automatico dos thumbnails para manter o ativo visivel
  // ============================================================

  useEffect(() => {
    if (!thumbnailStripRef.current) return;

    const strip = thumbnailStripRef.current;
    const activeThumb = strip.children[safeIndex] as HTMLElement | undefined;

    if (activeThumb) {
      // Calcula a posicao ideal para centralizar o thumbnail ativo
      const scrollLeft =
        activeThumb.offsetLeft -
        strip.clientWidth / 2 +
        activeThumb.clientWidth / 2;

      strip.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [safeIndex]);

  // ============================================================
  // Zoom ao passar o mouse (desktop)
  // ============================================================

  /** Calcula a origem do zoom baseado na posicao do cursor */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setZoomOrigin({ x, y });
      setIsZooming(true);
    },
    []
  );

  /** Desativa o zoom quando o cursor sai da imagem */
  const handleMouseLeave = useCallback(() => {
    setIsZooming(false);
  }, []);

  // ============================================================
  // Suporte a swipe no mobile (touch events)
  // ============================================================

  /** Registra a posicao inicial do toque */
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  /** Processa o movimento do toque e decide se houve swipe */
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Previne o scroll da pagina durante o swipe horizontal
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Se o movimento horizontal for dominante, previne o scroll vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  }, []);

  /** Finaliza o toque e executa a navegacao se necessario */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;

      // Verifica se o swipe foi longo o suficiente
      if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
        if (deltaX < 0) {
          // Swipe para a esquerda -> proxima imagem
          goNext();
        } else {
          // Swipe para a direita -> imagem anterior
          goPrev();
        }
      }

      // Limpa a referencia do toque
      touchStartRef.current = null;
    },
    [goNext, goPrev]
  );

  // ============================================================
  // Navegacao via teclado (acessibilidade)
  // ============================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext]
  );

  // ============================================================
  // Renderizacao: estado vazio (sem imagens)
  // ============================================================

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-gray-100 border-2 border-dashed border-gray-300">
        <p className="text-sm text-gray-400">Sem imagens disponiveis</p>
      </div>
    );
  }

  // Imagem atualmente exibida
  const currentImage = images[displayIndex] ?? images[0];

  // ============================================================
  // Renderizacao principal
  // ============================================================

  return (
    <div className="flex w-full flex-col gap-3">
      {/* --------------------------------------------------------
          Imagem principal com zoom e suporte a swipe
      -------------------------------------------------------- */}
      <div
        ref={containerRef}
        className={cn(
          "group relative aspect-square w-full overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-baby-pink/5 to-baby-blue/5",
          "border-2 border-baby-pink/20",
          "cursor-crosshair select-none",
          "shadow-pastel",
          "focus:outline-none focus:ring-2 focus:ring-baby-pink/50 focus:ring-offset-2"
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={`Galeria de imagens: ${productTitle}`}
        aria-roledescription="galeria de imagens"
      >
        {/* Imagem com transicao de fade e zoom */}
        <div
          className={cn(
            "h-full w-full transition-opacity",
            isFading ? "opacity-0" : "opacity-100"
          )}
          style={{
            transitionDuration: `${FADE_DURATION_MS}ms`,
            transitionTimingFunction: "ease-in-out",
          }}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.alt || productTitle}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            priority={displayIndex === 0}
            className={cn(
              "object-cover transition-transform duration-300 ease-out",
              isZooming && "duration-100"
            )}
            style={
              isZooming
                ? {
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    transform: `scale(${ZOOM_SCALE})`,
                  }
                : {
                    transformOrigin: "center center",
                    transform: "scale(1)",
                  }
            }
          />
        </div>

        {/* Indicador de zoom (visivel apenas no desktop ao hover) */}
        <div
          className={cn(
            "pointer-events-none absolute right-3 top-3 z-10",
            "flex items-center gap-1.5 rounded-full",
            "bg-white/80 px-3 py-1.5 backdrop-blur-sm",
            "text-xs font-bold text-gray-600",
            "shadow-sm border border-baby-pink/20",
            "transition-opacity duration-200",
            "hidden md:flex",
            isZooming ? "opacity-0" : "opacity-100 group-hover:opacity-100"
          )}
        >
          <ZoomIn size={14} className="text-baby-pink" />
          <span>Zoom</span>
        </div>

        {/* Contador de imagens (mobile) */}
        <div
          className={cn(
            "absolute bottom-3 left-1/2 z-10 -translate-x-1/2",
            "rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm",
            "text-xs font-bold text-white",
            "md:hidden"
          )}
        >
          {safeIndex + 1} / {images.length}
        </div>

        {/* Setas de navegacao (exibidas se houver mais de uma imagem) */}
        {images.length > 1 && (
          <>
            {/* Seta esquerda (imagem anterior) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className={cn(
                "absolute left-2 top-1/2 z-10 -translate-y-1/2",
                "flex h-10 w-10 items-center justify-center",
                "rounded-full bg-white/80 backdrop-blur-sm",
                "border border-baby-pink/20 shadow-md",
                "text-gray-600 transition-all duration-200",
                "hover:bg-white hover:text-baby-pink hover:shadow-lg hover:scale-110",
                "active:scale-95",
                "opacity-0 group-hover:opacity-100",
                "md:h-11 md:w-11",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-baby-pink/50"
              )}
              aria-label="Imagem anterior"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>

            {/* Seta direita (proxima imagem) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className={cn(
                "absolute right-2 top-1/2 z-10 -translate-y-1/2",
                "flex h-10 w-10 items-center justify-center",
                "rounded-full bg-white/80 backdrop-blur-sm",
                "border border-baby-pink/20 shadow-md",
                "text-gray-600 transition-all duration-200",
                "hover:bg-white hover:text-baby-pink hover:shadow-lg hover:scale-110",
                "active:scale-95",
                "opacity-0 group-hover:opacity-100",
                "md:h-11 md:w-11",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-baby-pink/50"
              )}
              aria-label="Proxima imagem"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {/* --------------------------------------------------------
          Strip de thumbnails (miniaturas clicaveis)
      -------------------------------------------------------- */}
      {images.length > 1 && (
        <div
          ref={thumbnailStripRef}
          className={cn(
            "flex gap-2 overflow-x-auto pb-1",
            "scrollbar-thin scrollbar-thumb-baby-pink/30 scrollbar-track-transparent",
            // Esconde a scrollbar nativa no mobile para visual mais limpo
            "[&::-webkit-scrollbar]:h-1",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-baby-pink/30"
          )}
          role="tablist"
          aria-label="Miniaturas das imagens do produto"
        >
          {images.map((image, index) => (
            <button
              key={`thumb-${index}-${image.url}`}
              type="button"
              onClick={() => goToImage(index)}
              role="tab"
              aria-selected={safeIndex === index}
              aria-label={`Ver imagem ${index + 1}: ${image.alt || productTitle}`}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl",
                "border-2 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-baby-pink/50 focus:ring-offset-1",
                "md:h-20 md:w-20",
                safeIndex === index
                  ? // Thumbnail ativo: borda rosa com brilho
                    "border-baby-pink shadow-pink-glow ring-1 ring-baby-pink/30 scale-105"
                  : // Thumbnail inativo: borda neutra com hover rosa
                    "border-gray-200 opacity-70 hover:opacity-100 hover:border-baby-pink/50 hover:scale-105"
              )}
            >
              <Image
                src={image.url}
                alt={image.alt || `${productTitle} - imagem ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />

              {/* Overlay sutil no thumbnail inativo */}
              {safeIndex !== index && (
                <div className="absolute inset-0 bg-white/10 transition-opacity duration-200 hover:bg-transparent" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------
          Indicadores de ponto (dots) para mobile
      -------------------------------------------------------- */}
      {images.length > 1 && images.length <= 8 && (
        <div className="flex items-center justify-center gap-1.5 md:hidden" role="tablist">
          {images.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={() => goToImage(index)}
              role="tab"
              aria-selected={safeIndex === index}
              aria-label={`Ir para imagem ${index + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                safeIndex === index
                  ? "w-6 bg-baby-pink"
                  : "w-2 bg-gray-300 hover:bg-baby-pink/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
