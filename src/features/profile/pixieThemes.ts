export const pixieThemeKeys = ["tide", "ember", "grove", "nova", "moon", "aurora"] as const;

export type PixieTheme = (typeof pixieThemeKeys)[number];

export type PixieThemeOption = {
  key: PixieTheme;
  name: string;
  personality: string;
  color: string;
};

export const defaultPixieTheme: PixieTheme = "tide";

export const pixieThemes: PixieThemeOption[] = [
  {
    key: "tide",
    name: "Tide",
    personality: "Calm, hopeful and consistent",
    color: "#35d9cd",
  },
  {
    key: "ember",
    name: "Ember",
    personality: "Bright, bold and ambitious",
    color: "#ff9d66",
  },
  {
    key: "grove",
    name: "Grove",
    personality: "Grounded, patient and growing",
    color: "#91d26f",
  },
  {
    key: "nova",
    name: "Nova",
    personality: "Curious, adventurous and dreamy",
    color: "#75a7ff",
  },
  {
    key: "moon",
    name: "Moon",
    personality: "Thoughtful, gentle and careful",
    color: "#d8c9ff",
  },
  {
    key: "aurora",
    name: "Aurora",
    personality: "Playful, optimistic and surprising",
    color: "#6ee7b7",
  },
];

const storageKey = "savepixie.pixie-theme";

export function isPixieTheme(value: unknown): value is PixieTheme {
  return typeof value === "string" && pixieThemeKeys.includes(value as PixieTheme);
}

export function getRememberedPixieTheme(): PixieTheme {
  if (typeof window === "undefined") return defaultPixieTheme;
  const remembered = window.localStorage.getItem(storageKey);
  return isPixieTheme(remembered) ? remembered : defaultPixieTheme;
}

export function applyPixieTheme(theme: PixieTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.pixieTheme = theme;
}

export function rememberPixieTheme(theme: PixieTheme): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, theme);
  }
  applyPixieTheme(theme);
}
