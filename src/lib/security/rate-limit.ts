import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import {
  LIMITS,
  clientIp,
  retryAfterSeconds,
  type RateLimitBucket,
  type RateLimitVerdict,
} from "@/lib/security/limits";

export {
  LIMITS,
  clientIp,
  normalizeEmail,
  type RateLimitBucket,
  type RateLimitVerdict,
} from "@/lib/security/limits";

function hashedKey(name: string, id: string): string {
  const secret = process.env.AUTH_SECRET ?? "rhythm-dev";
  return createHash("sha256").update(`${secret}:${name}:${id}`).digest("hex");
}

export function tooManyResponse(retryAfterSec: number): Response {
  return Response.json(
    { error: "Too many requests. Try again in a few minutes." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

/** Reject POST/PATCH bodies larger than {@link LIMITS.maxJsonBytes}. */
export function rejectHugeBody(request: Request): Response | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const size = Number(raw);
  if (Number.isFinite(size) && size > LIMITS.maxJsonBytes) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  return null;
}

/**
 * Atomically increment a hashed bucket. On window expiry the count resets to 1.
 * `strict` callers should treat store failures as a deny (fail closed).
 */
async function consumeRateLimit(
  name: string,
  id: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitVerdict> {
  const db = getDb();
  const key = hashedKey(name, id);
  const now = Date.now();

  const [row] = await db
    .insert(rateLimits)
    .values({
      key,
      count: 1,
      windowStart: new Date(now),
    })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} <= now() - (${windowMs}::int * interval '1 millisecond') then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} <= now() - (${windowMs}::int * interval '1 millisecond') then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning();

  const count = row?.count ?? 1;
  const windowStart = row?.windowStart.getTime() ?? now;
  if (count > limit) {
    return {
      ok: false,
      retryAfterSec: retryAfterSeconds(windowStart, windowMs, now),
    };
  }
  return { ok: true, retryAfterSec: 1 };
}

export async function limitRequest(
  request: Request,
  options: { buckets: readonly RateLimitBucket[]; strict?: boolean },
): Promise<Response | null> {
  const ip = clientIp(request);
  let worstRetry = 1;
  let blocked = false;

  try {
    for (const bucket of options.buckets) {
      const result = await consumeRateLimit(
        bucket.name,
        bucket.id ?? ip,
        bucket.limit,
        bucket.windowMs,
      );
      if (!result.ok) {
        blocked = true;
        worstRetry = Math.max(worstRetry, result.retryAfterSec);
      }
    }
  } catch (error) {
    console.error("rate limit store failed", error);
    if (options.strict) {
      return tooManyResponse(60);
    }
    return null;
  }

  if (blocked) {
    return tooManyResponse(worstRetry);
  }
  return null;
}

export async function guardApiRead(request: Request): Promise<Response | null> {
  return limitRequest(request, {
    buckets: [
      {
        name: "api-read",
        limit: LIMITS.apiRead.limit,
        windowMs: LIMITS.apiRead.windowMs,
      },
    ],
  });
}

export async function guardApiWrite(
  request: Request,
): Promise<Response | null> {
  const oversized = rejectHugeBody(request);
  if (oversized) return oversized;
  return limitRequest(request, {
    strict: true,
    buckets: [
      {
        name: "api-write",
        limit: LIMITS.apiWrite.limit,
        windowMs: LIMITS.apiWrite.windowMs,
      },
    ],
  });
}

export async function pruneRateLimits(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const deleted = await getDb()
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, cutoff))
    .returning({ key: rateLimits.key });
  return deleted.length;
}
