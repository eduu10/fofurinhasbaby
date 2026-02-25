/**
 * Cache em memória para respostas de API.
 *
 * Usa Map com timestamps para TTL.
 * Se Redis estiver disponível no futuro, substituir esta implementação.
 *
 * TTLs padrão:
 * - Preços: 4 horas (14400s)
 * - Imagens/dados estáticos: 24 horas (86400s)
 * - Taxa de câmbio: 1 hora (3600s)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL = {
  /** 4 horas para dados de preço */
  PRICE: 4 * 60 * 60 * 1000,
  /** 24 horas para imagens e dados estáticos */
  STATIC: 24 * 60 * 60 * 1000,
  /** 1 hora para taxa de câmbio */
  EXCHANGE_RATE: 60 * 60 * 1000,
  /** 30 minutos para resultados de busca */
  SEARCH: 30 * 60 * 1000,
} as const;

export type CacheTTL = keyof typeof TTL;

class ApiCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Busca um valor no cache. Retorna null se expirado ou não encontrado.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Armazena um valor no cache com TTL.
   */
  set<T>(key: string, data: T, ttlType: CacheTTL = "PRICE"): void {
    const ttlMs = TTL[ttlType];
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Armazena com TTL customizado em milissegundos.
   */
  setWithTTL<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Remove uma entrada do cache.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Limpa entradas expiradas (executar periodicamente se necessário).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Retorna estatísticas do cache.
   */
  stats(): { size: number; entries: { key: string; expiresIn: number }[] } {
    const now = Date.now();
    const entries = Array.from(this.store.entries()).map(([key, entry]) => ({
      key,
      expiresIn: Math.max(0, Math.round((entry.expiresAt - now) / 1000)),
    }));
    return { size: this.store.size, entries };
  }

  /**
   * Limpa todo o cache.
   */
  clear(): void {
    this.store.clear();
  }
}

// Singleton global
const globalForCache = globalThis as typeof globalThis & { _apiCache?: ApiCache };
export const apiCache = globalForCache._apiCache ?? new ApiCache();
if (process.env.NODE_ENV !== "production") {
  globalForCache._apiCache = apiCache;
}

// Helpers para chaves de cache padronizadas
export function productCacheKey(productId: string): string {
  return `product:${productId}`;
}

export function searchCacheKey(query: string, page: number): string {
  return `search:${query}:${page}`;
}

export function exchangeRateCacheKey(): string {
  return "exchange_rate:usd_brl";
}
