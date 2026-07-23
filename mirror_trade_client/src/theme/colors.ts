/**
 * App palette — aligned with Home (midnight + gold accents).
 * Use these tokens everywhere so screens stay uniform.
 */
export const colors = {
  /** Page background (Home APP_BG) */
  bg: "#1A1B26",
  /** Tab bar / elevated surfaces */
  surface: "#1E2030",
  /** Cards */
  card: "#242633",
  /** Nested / pressed surfaces */
  elevated: "#2A2D3C",
  /** Borders */
  border: "#2E3142",
  /** Secondary text */
  muted: "#94A3B8",
  /** Primary text */
  text: "#F8FAFC",

  /**
   * Interactive accent (Home yellow buttons / highlights).
   * Used for tabs, chips, links, CTAs.
   */
  primary: "#FFD143",
  primaryEnd: "#F5C518",
  primarySoft: "rgba(255, 209, 67, 0.12)",

  /** Optional secondary brand (soft violet for rare gradients) */
  brand: "#7C8CFF",
  brandSoft: "rgba(124, 140, 255, 0.14)",

  profit: "#22C55E",
  loss: "#FF3B5C",
  warn: "#F5A524",
  greenBtn: "#00C853",
  chipBg: "#2A2D3C",
} as const;
