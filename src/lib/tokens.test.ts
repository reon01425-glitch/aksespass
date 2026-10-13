import { describe, expect, it } from "vitest";
import { DESIGN_TOKENS, getDesignTokens } from "./tokens";

describe("getDesignTokens", () => {
  it("mengembalikan seluruh token warna sesuai design.md §2C", () => {
    const tokens = getDesignTokens();
    expect(Object.keys(tokens)).toHaveLength(17);
    expect(tokens["--bg-page"]).toBe("#ECFEFF");
    expect(tokens["--btn-primary"]).toBe("#0E7490");
    expect(tokens["--text-main"]).toBe("#164E63");
    expect(tokens["--success-fg"]).toBe("#047857");
    expect(tokens["--warning-fg"]).toBe("#B45309");
    expect(tokens["--error-fg"]).toBe("#B91C1C");
  });

  it("tidak menyertakan warna placeholder terlarang (#94A3B8)", () => {
    const values = Object.values(DESIGN_TOKENS);
    expect(values).not.toContain("#94A3B8");
  });
});
