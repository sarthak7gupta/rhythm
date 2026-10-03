import { afterEach, describe, expect, it } from "vitest";
import { authorizeCron } from "@/lib/cron";

describe("authorizeCron", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });

  it("rejects anonymous callers", () => {
    process.env.CRON_SECRET = "test-secret";
    const response = authorizeCron(new Request("https://example.com/cron"));
    expect(response?.status).toBe(401);
  });

  it("allows a matching bearer token", () => {
    process.env.CRON_SECRET = "test-secret";
    const response = authorizeCron(
      new Request("https://example.com/cron", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(response).toBeNull();
  });

  it("allows the Vercel cron header", () => {
    delete process.env.CRON_SECRET;
    const response = authorizeCron(
      new Request("https://example.com/cron", {
        headers: { "x-vercel-cron": "1" },
      }),
    );
    expect(response).toBeNull();
  });
});
