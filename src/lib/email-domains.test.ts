import { describe, expect, it } from "vitest";
import { applyEmailDomain, matchingEmailDomains } from "@/lib/email-domains";

describe("matchingEmailDomains", () => {
  it("hides suggestions until @ is typed", () => {
    expect(matchingEmailDomains("ada")).toEqual([]);
  });

  it("lists domains after @", () => {
    expect(matchingEmailDomains("ada@")).toEqual([
      "gmail.com",
      "outlook.com",
      "yahoo.com",
      "icloud.com",
      "hotmail.com",
      "proton.me",
    ]);
  });

  it("filters by typed domain prefix", () => {
    expect(matchingEmailDomains("ada@g")).toEqual(["gmail.com"]);
    expect(matchingEmailDomains("ada@out")).toEqual(["outlook.com"]);
  });

  it("hides a domain once it is complete", () => {
    expect(matchingEmailDomains("ada@gmail.com")).toEqual([]);
  });
});

describe("applyEmailDomain", () => {
  it("replaces the domain after @", () => {
    expect(applyEmailDomain("ada@g", "gmail.com")).toBe("ada@gmail.com");
  });
});
