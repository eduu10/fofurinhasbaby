import { DropshipperClient, AffiliateClient } from "ae_sdk";

// ---------------------------------------------------------------------------
// AliExpress SDK Clients
// ---------------------------------------------------------------------------
// All three env vars are REQUIRED for real API access.  When they are missing
// (local dev without credentials) the helpers below return `null` so callers
// can gracefully fall back to mock data.
// ---------------------------------------------------------------------------

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) return "";
  return value;
}

const APP_KEY = getEnv("ALIEXPRESS_APP_KEY");
const APP_SECRET = getEnv("ALIEXPRESS_APP_SECRET");
const ACCESS_TOKEN = getEnv("ALIEXPRESS_ACCESS_TOKEN");

/**
 * Whether the AliExpress credentials are configured.
 * Used throughout the app to decide between real API calls and mock data.
 */
export function isAliExpressConfigured(): boolean {
  return !!(APP_KEY && APP_SECRET && ACCESS_TOKEN);
}

// ---------------------------------------------------------------------------
// Singleton instances (lazy – created once on first use)
// ---------------------------------------------------------------------------

let _dropshipperClient: DropshipperClient | null = null;
let _affiliateClient: AffiliateClient | null = null;

/**
 * Returns a configured DropshipperClient or `null` if credentials are missing.
 */
export function getDropshipperClient(): DropshipperClient | null {
  if (!isAliExpressConfigured()) return null;
  if (!_dropshipperClient) {
    _dropshipperClient = new DropshipperClient({
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      session: ACCESS_TOKEN,
    });
  }
  return _dropshipperClient;
}

/**
 * Returns a configured AffiliateClient or `null` if credentials are missing.
 */
export function getAffiliateClient(): AffiliateClient | null {
  if (!isAliExpressConfigured()) return null;
  if (!_affiliateClient) {
    _affiliateClient = new AffiliateClient({
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      session: ACCESS_TOKEN,
    });
  }
  return _affiliateClient;
}

/**
 * Returns the configured tracking ID for affiliate links.
 */
export function getTrackingId(): string {
  return getEnv("ALIEXPRESS_TRACKING_ID");
}

// ---------------------------------------------------------------------------
// Retry helper – wraps SDK calls with exponential back-off to handle
// AliExpress rate limits gracefully.
// ---------------------------------------------------------------------------

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Currency conversion cache
// ---------------------------------------------------------------------------

let _cachedRate: { rate: number; fetchedAt: number } | null = null;
const RATE_CACHE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the current USD → BRL exchange rate with 1-hour cache.
 * Falls back to a static rate of 5.5 on failure.
 */
export async function getUsdToBrlRate(): Promise<number> {
  if (_cachedRate && Date.now() - _cachedRate.fetchedAt < RATE_CACHE_MS) {
    return _cachedRate.rate;
  }

  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      { next: { revalidate: 3600 } } as RequestInit,
    );
    const json = await res.json();
    const rate = parseFloat(json.USDBRL?.bid ?? "5.5");
    _cachedRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return _cachedRate?.rate ?? 5.5;
  }
}

/**
 * Converts a price from USD (or USD cents) to BRL.
 * @param priceUsd  Price in USD (dollars, not cents)
 * @param margin    Profit margin to apply (e.g. 0.4 = 40%)
 */
export async function convertToBrl(
  priceUsd: number,
  margin = 0,
): Promise<number> {
  const rate = await getUsdToBrlRate();
  const base = priceUsd * rate;
  return Math.round((base * (1 + margin)) * 100) / 100;
}
