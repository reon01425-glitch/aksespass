export const DESIGN_TOKENS = {
  "--bg-page": "#ECFEFF",
  "--bg-surface": "#CFFAFE",
  "--border-decorative": "#22D3EE",
  "--border-input": "#155E75",
  "--icon-accent": "#0891B2",
  "--btn-primary": "#0E7490",
  "--text-main": "#164E63",
  "--text-secondary": "#475569",
  "--text-link": "#155E75",
  "--disabled-surface": "#E2E8F0",
  "--disabled-text": "#64748B",
  "--success-bg": "#ECFDF5",
  "--success-fg": "#047857",
  "--warning-bg": "#FFFBEB",
  "--warning-fg": "#B45309",
  "--error-bg": "#FEF2F2",
  "--error-fg": "#B91C1C",
} as const;

export type DesignTokenName = keyof typeof DESIGN_TOKENS;

export function getDesignTokens(): Record<DesignTokenName, string> {
  return { ...DESIGN_TOKENS };
}
