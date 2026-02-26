"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Estrutura de uma notificacao de venda */
interface SaleNotification {
  id: string;
  firstName: string;
  city: string;
  product: string;
  image: string | null;
  slug: string | null;
  minutesAgo: number;
}

/** Resposta esperada da API /api/orders/recent */
interface RecentOrdersResponse {
  success: boolean;
  data: Array<{
    name: string;
    city: string;
    product: string;
    image: string | null;
    slug: string | null;
    minutesAgo: number;
  }>;
}

// ─── Dados mock (fallback quando a API falha) ────────────────────────────────

/** Nomes e cidades brasileiros falsos para prova social */
const MOCK_NOTIFICATIONS: SaleNotification[] = [
  {
    id: "mock-1",
    firstName: "Maria",
    city: "Sao Paulo",
    product: "Kit Body Bebe Algodao 3 pecas",
    image: null,
    slug: null,
    minutesAgo: 3,
  },
  {
    id: "mock-2",
    firstName: "Ana",
    city: "Rio de Janeiro",
    product: "Manta Soft Recen-Nascido",
    image: null,
    slug: null,
    minutesAgo: 7,
  },
  {
    id: "mock-3",
    firstName: "Juliana",
    city: "Belo Horizonte",
    product: "Sapatinho de Trico Bebe",
    image: null,
    slug: null,
    minutesAgo: 12,
  },
  {
    id: "mock-4",
    firstName: "Camila",
    city: "Curitiba",
    product: "Conjunto Moletom Infantil Urso",
    image: null,
    slug: null,
    minutesAgo: 15,
  },
  {
    id: "mock-5",
    firstName: "Fernanda",
    city: "Salvador",
    product: "Fralda de Pano Bordada 5 unid",
    image: null,
    slug: null,
    minutesAgo: 18,
  },
  {
    id: "mock-6",
    firstName: "Patricia",
    city: "Brasilia",
    product: "Babador Silicone com Bolso",
    image: null,
    slug: null,
    minutesAgo: 22,
  },
  {
    id: "mock-7",
    firstName: "Larissa",
    city: "Fortaleza",
    product: "Toalha de Banho com Capuz",
    image: null,
    slug: null,
    minutesAgo: 25,
  },
  {
    id: "mock-8",
    firstName: "Beatriz",
    city: "Recife",
    product: "Mamadeira Anticolica 260ml",
    image: null,
    slug: null,
    minutesAgo: 30,
  },
  {
    id: "mock-9",
    firstName: "Renata",
    city: "Porto Alegre",
    product: "Chupeta Ortodontica 0-6m",
    image: null,
    slug: null,
    minutesAgo: 35,
  },
  {
    id: "mock-10",
    firstName: "Gabriela",
    city: "Manaus",
    product: "Kit Higiene Bebe 5 pecas",
    image: null,
    slug: null,
    minutesAgo: 42,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera um intervalo aleatorio entre 30 e 60 segundos (em ms) */
function randomInterval(): number {
  return (Math.floor(Math.random() * 31) + 30) * 1000;
}

/** Verifica se o pathname atual pertence a area administrativa */
function isAdminPage(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/admin");
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function SalesNotification() {
  // Notificacao atualmente visivel
  const [current, setCurrent] = useState<SaleNotification | null>(null);
  // Controle de visibilidade e animacao
  const [visible, setVisible] = useState<boolean>(false);
  // Flag para saber se o usuario dispensou manualmente
  const [dismissed, setDismissed] = useState<boolean>(false);
  // Lista de notificacoes carregadas (API ou mock)
  const notificationsRef = useRef<SaleNotification[]>([]);
  // Indice atual na rotacao
  const indexRef = useRef<number>(0);
  // Referencia para o timer de rotacao
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Referencia para o timer de auto-hide
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Busca dados reais da API ou usa mock como fallback.
   * Chamado uma vez na montagem do componente.
   */
  const fetchNotifications = useCallback(async (): Promise<SaleNotification[]> => {
    try {
      const response = await fetch("/api/orders/recent", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}`);
      }

      const data: RecentOrdersResponse = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        return data.data.map((item, i) => ({
          id: `api-${i}`,
          firstName: item.name,
          city: item.city,
          product: item.product,
          image: item.image,
          slug: item.slug,
          minutesAgo: item.minutesAgo,
        }));
      }

      // Se a API retornar vazio, usa mock
      return MOCK_NOTIFICATIONS;
    } catch {
      // Em caso de erro na API, usa dados mock
      return MOCK_NOTIFICATIONS;
    }
  }, []);

  /**
   * Exibe a proxima notificacao da lista com animacao de entrada.
   * Apos 5 segundos, faz animacao de saida.
   */
  const showNext = useCallback(() => {
    if (dismissed) return;

    const notifications = notificationsRef.current;
    if (notifications.length === 0) return;

    // Pega a proxima notificacao (rotacao circular)
    const notification = notifications[indexRef.current % notifications.length];
    indexRef.current += 1;

    // Exibe com animacao de entrada
    setCurrent(notification);
    setVisible(true);

    // Apos 5 segundos, esconde com animacao de saida
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 5000);
  }, [dismissed]);

  /**
   * Agenda a proxima exibicao com intervalo aleatorio.
   */
  const scheduleNext = useCallback(() => {
    if (dismissed) return;

    rotationTimerRef.current = setTimeout(() => {
      showNext();
      // Agenda o proximo apos a exibicao atual
      scheduleNext();
    }, randomInterval());
  }, [dismissed, showNext]);

  /**
   * Fecha a notificacao manualmente e para o ciclo de rotacao.
   */
  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);

    // Limpa todos os timers ativos
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // ─── Efeito principal: inicializacao ─────────────────────────────────────

  useEffect(() => {
    // Nao exibe em paginas administrativas
    if (isAdminPage()) return;

    let mounted = true;

    // Espera 10 segundos antes de comecar a exibir notificacoes
    const initialDelay = setTimeout(async () => {
      if (!mounted) return;

      // Busca notificacoes (API ou mock)
      const data = await fetchNotifications();
      notificationsRef.current = data;

      // Exibe a primeira notificacao
      showNext();

      // Agenda proximas notificacoes com intervalo aleatorio
      scheduleNext();
    }, 10000);

    // Limpeza ao desmontar o componente
    return () => {
      mounted = false;
      clearTimeout(initialDelay);

      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [fetchNotifications, showNext, scheduleNext]);

  // ─── Nao renderiza se nao houver notificacao ou se foi dispensado ────────

  if (!current || dismissed) return null;

  // ─── Renderizacao ────────────────────────────────────────────────────────

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Posicao fixa no canto inferior esquerdo
        "fixed bottom-6 left-6 z-50 max-w-sm",
        // Animacao de slide (entrada/saida pela esquerda)
        "transition-all duration-500 ease-in-out",
        visible
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      )}
    >
      <div
        className={cn(
          // Card com borda rosa a esquerda
          "relative flex items-center gap-3 rounded-xl bg-white p-4",
          "border-l-4 border-pink-500",
          // Sombra sutil
          "shadow-lg shadow-black/10",
          // Responsividade
          "w-[340px] sm:w-[380px]"
        )}
      >
        {/* Botao de fechar (X) */}
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute top-2 right-2 p-1 rounded-full",
            "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
            "transition-colors cursor-pointer"
          )}
          aria-label="Fechar notificacao"
        >
          <X size={14} />
        </button>

        {/* Thumbnail do produto ou icone generico */}
        <div className="flex-shrink-0">
          {current.image ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={current.image}
                alt={current.product}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center">
              <ShoppingBag size={20} className="text-pink-500" />
            </div>
          )}
        </div>

        {/* Conteudo da notificacao */}
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm text-gray-800 leading-snug">
            <span className="font-bold text-gray-900">{current.firstName}</span>{" "}
            de{" "}
            <span className="font-semibold text-gray-700">{current.city}</span>{" "}
            comprou
          </p>
          <p className="text-sm font-semibold text-pink-600 truncate mt-0.5">
            {current.product}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ha {current.minutesAgo} min atras
          </p>
        </div>
      </div>
    </div>
  );
}
