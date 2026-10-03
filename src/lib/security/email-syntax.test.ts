import { describe, expect, it } from "vitest";
import {
  domainAncestors,
  isWellFormedEmail,
  parseEmailSyntax,
} from "@/lib/security/email-syntax";

describe("parseEmailSyntax", () => {
  it("accepts ordinary inboxes", () => {
    expect(parseEmailSyntax("  Ada@Gmail.COM ")?.email).toBe("ada@gmail.com");
    expect(isWellFormedEmail("ada+rhythm@outlook.com")).toBe(true);
    expect(isWellFormedEmail("first.last@proton.me")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isWellFormedEmail("")).toBe(false);
    expect(isWellFormedEmail("ada")).toBe(false);
    expect(isWellFormedEmail("ada@gmail")).toBe(false);
    expect(isWellFormedEmail("ada@gmail.")).toBe(false);
    expect(isWellFormedEmail(".ada@gmail.com")).toBe(false);
    expect(isWellFormedEmail("ada.@gmail.com")).toBe(false);
    expect(isWellFormedEmail("ada..b@gmail.com")).toBe(false);
    expect(isWellFormedEmail("ada@gmail..com")).toBe(false);
    expect(isWellFormedEmail("ada@127.0.0.1")).toBe(false);
    expect(isWellFormedEmail("ada@localhost")).toBe(false);
    expect(isWellFormedEmail("ada@example.com")).toBe(false);
    expect(isWellFormedEmail("ada@foo.local")).toBe(false);
    expect(isWellFormedEmail("ada gupta@gmail.com")).toBe(false);
  });

  it("walks domain parents", () => {
    expect(domainAncestors("a.b.mailinator.com")).toEqual([
      "a.b.mailinator.com",
      "b.mailinator.com",
      "mailinator.com",
    ]);
  });
});
