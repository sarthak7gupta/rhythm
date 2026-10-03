import { describe, expect, it } from "vitest";
import { checkSignupEmail } from "@/lib/security/email";

describe("checkSignupEmail", () => {
  it("allows real providers", () => {
    expect(checkSignupEmail("ada@gmail.com")).toEqual({
      ok: true,
      email: "ada@gmail.com",
    });
    expect(checkSignupEmail("ada@proton.me").ok).toBe(true);
    expect(checkSignupEmail("ada@anonaddy.com").ok).toBe(true);
  });

  it("blocks disposable domains and their subdomains", () => {
    expect(checkSignupEmail("ada@mailinator.com")).toEqual({
      ok: false,
      reason: "disposable",
    });
    expect(checkSignupEmail("ada@guerrillamail.com")).toEqual({
      ok: false,
      reason: "disposable",
    });
    expect(checkSignupEmail("ada@yopmail.com")).toEqual({
      ok: false,
      reason: "disposable",
    });
    expect(checkSignupEmail("ada@10minutemail.com")).toEqual({
      ok: false,
      reason: "disposable",
    });
    expect(checkSignupEmail("ada@foo.mailinator.com")).toEqual({
      ok: false,
      reason: "disposable",
    });
  });

  it("blocks invalid syntax separately from throwaways", () => {
    expect(checkSignupEmail("not-an-email")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(checkSignupEmail("ada@example.com")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
