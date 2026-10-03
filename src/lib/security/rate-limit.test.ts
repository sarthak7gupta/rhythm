import { describe, expect, it } from "vitest";
import {
  clientIp,
  hitWindow,
  LIMITS,
  normalizeEmail,
  retryAfterSeconds,
} from "@/lib/security/limits";
import { rejectHugeBody } from "@/lib/security/rate-limit";

describe("hitWindow", () => {
  it("starts a new window when none exists", () => {
    expect(hitWindow(null, 1_000, 60_000)).toEqual({
      windowStart: 1_000,
      count: 1,
    });
  });

  it("increments inside the window", () => {
    expect(hitWindow({ windowStart: 1_000, count: 2 }, 20_000, 60_000)).toEqual(
      { windowStart: 1_000, count: 3 },
    );
  });

  it("resets after the window elapses", () => {
    expect(hitWindow({ windowStart: 1_000, count: 9 }, 61_000, 60_000)).toEqual(
      { windowStart: 61_000, count: 1 },
    );
  });

  it("computes retry-after from the active window", () => {
    expect(retryAfterSeconds(1_000, 60_000, 10_000)).toBe(51);
  });
});

describe("request identity", () => {
  it("uses the first forwarded IP", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.8");
  });

  it("normalizes emails for buckets", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });
});

describe("rejectHugeBody", () => {
  it("allows missing or small content-length", () => {
    expect(rejectHugeBody(new Request("https://example.com"))).toBeNull();
    expect(
      rejectHugeBody(
        new Request("https://example.com", {
          headers: { "content-length": "128" },
        }),
      ),
    ).toBeNull();
  });

  it("rejects oversized payloads", async () => {
    const response = rejectHugeBody(
      new Request("https://example.com", {
        headers: { "content-length": String(LIMITS.maxJsonBytes + 1) },
      }),
    );
    expect(response?.status).toBe(413);
    const body = (await response?.json()) as { error: string };
    expect(body.error).toBe("Payload too large");
  });
});

describe("hitWindow", () => {
  it("starts a new window when none exists", () => {
    expect(hitWindow(null, 1_000, 60_000)).toEqual({
      windowStart: 1_000,
      count: 1,
    });
  });

  it("increments inside the window", () => {
    expect(hitWindow({ windowStart: 1_000, count: 2 }, 20_000, 60_000)).toEqual(
      { windowStart: 1_000, count: 3 },
    );
  });

  it("resets after the window elapses", () => {
    expect(hitWindow({ windowStart: 1_000, count: 9 }, 61_000, 60_000)).toEqual(
      { windowStart: 61_000, count: 1 },
    );
  });

  it("computes retry-after from the active window", () => {
    expect(retryAfterSeconds(1_000, 60_000, 10_000)).toBe(51);
  });
});
