export const PREFERENCE_COOKIE_NAME = "aksespass_pref";

export const VALID_TEXT_SIZES = ["100", "150", "200"] as const;
export type TextSize = (typeof VALID_TEXT_SIZES)[number];

export const VALID_CONTRASTS = ["standard", "high"] as const;
export type ContrastMode = (typeof VALID_CONTRASTS)[number];

export const VALID_READING_MODES = ["standard", "screen-reader"] as const;
export type ReadingMode = (typeof VALID_READING_MODES)[number];

export interface AppPreferences {
  textSize: TextSize;
  contrast: ContrastMode;
  /** Mode pembaca layar. Hanya disimpan sebagai preferensi, belum mengubah tampilan. */
  readingMode: ReadingMode;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  textSize: "100",
  contrast: "standard",
  readingMode: "standard",
};

export const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 tahun
