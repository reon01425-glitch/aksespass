export const PREFERENCE_COOKIE_NAME = "aksespass_pref";

export const VALID_TEXT_SIZES = ["100", "150", "200"] as const;
export type TextSize = (typeof VALID_TEXT_SIZES)[number];

export const VALID_CONTRASTS = ["standard", "high"] as const;
export type ContrastMode = (typeof VALID_CONTRASTS)[number];

export interface AppPreferences {
  textSize: TextSize;
  contrast: ContrastMode;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  textSize: "100",
  contrast: "standard",
};

export const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 tahun
