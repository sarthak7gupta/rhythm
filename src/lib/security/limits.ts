/**
 * Product-facing rate and size caps. Windowed limits are stored in Postgres
 * (`rate_limits`) so they hold across Vercel instances.
 */
export const LIMITS = {
  authRead: { limit: 90, windowMs: 60_000 },
  authWrite: { limit: 30, windowMs: 60_000 },
  emailIp: { limit: 5, windowMs: 15 * 60_000 },
  emailAddr: { limit: 3, windowMs: 15 * 60_000 },
  emailGlobal: { limit: 40, windowMs: 15 * 60_000 },
  apiRead: { limit: 120, windowMs: 60_000 },
  apiWrite: { limit: 60, windowMs: 60_000 },
  routineCreate: { limit: 20, windowMs: 60 * 60_000 },
  routineCreateBurst: { limit: 8, windowMs: 60_000 },
  maxRoutines: 80,
  maxPushSubscriptions: 12,
  maxJsonBytes: 32_768,
} as const;

export type LimitName = keyof typeof LIMITS;

export type RateLimitBucket = {
  name: string;
  limit: number;
  windowMs: number;
  /** Defaults to the request IP when omitted. */
  id?: string;
};

export type WindowHit = {
  windowStart: number;
  count: number;
};

export type RateLimitVerdict = {
  ok: boolean;
  retryAfterSec: number;
};

/**
 * Next count/window after one hit. Keep this in lockstep with the SQL upsert
 * in `consumeRateLimit`.
 */
export function hitWindow(
  previous: WindowHit | null,
  now: number,
  windowMs: number,
): WindowHit {
  if (!previous || now - previous.windowStart >= windowMs) {
    return { windowStart: now, count: 1 };
  }
  return { windowStart: previous.windowStart, count: previous.count + 1 };
}

export function retryAfterSeconds(
  windowStart: number,
  windowMs: number,
  now: number,
): number {
  return Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
}

/** Best-effort client IP (first `X-Forwarded-For` hop, else `X-Real-IP`). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}
