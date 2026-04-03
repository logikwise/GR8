export type ColorThemeId =
  | "violet"
  | "teal"
  | "crimson"
  | "ember"
  | "sage"
  | "solaris";

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  preview: {
    accent: string;
    muted: string;
    bg: string;
  };
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "violet",
    name: "GRACE Violet",
    description: "Default — deep violet with luminous purple highlights",
    preview: {
      accent: "#7c3aed",
      muted: "#ede9fe",
      bg: "#1e1535",
    },
  },
  {
    id: "teal",
    name: "Teal Noir",
    description: "Cyberpunk cyan on near-black — sharp and electric",
    preview: {
      accent: "#66FCF1",
      muted: "#0b1f1e",
      bg: "#0B0C10",
    },
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "High-contrast red on deep slate — bold and decisive",
    preview: {
      accent: "#fe1a27",
      muted: "#2c1111",
      bg: "#1e2c39",
    },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber-orange on charcoal — energetic and focused",
    preview: {
      accent: "#e3874f",
      muted: "#1c0e05",
      bg: "#37363d",
    },
  },
  {
    id: "sage",
    name: "Rustic Sage",
    description: "Earthy olive and stone — calm, grounded, understated",
    preview: {
      accent: "#838264",
      muted: "#e6e3de",
      bg: "#112917",
    },
  },
  {
    id: "solaris",
    name: "Solaris",
    description: "Deep teal and copper warmth — industrial and precise",
    preview: {
      accent: "#116466",
      muted: "#d1e8e2",
      bg: "#2C3531",
    },
  },
];

export const DEFAULT_COLOR_THEME: ColorThemeId = "violet";
