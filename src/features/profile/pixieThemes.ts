export const pixieThemeKeys = ["tide", "ember", "grove", "nova", "moon", "aurora"] as const;

export type PixieTheme = (typeof pixieThemeKeys)[number];

export type PixieThemeOption = {
  key: PixieTheme;
  name: string;
  personality: string;
  color: string;
  assetPath: string;
};

export const defaultPixieTheme: PixieTheme = "tide";

export const pixieThemes: PixieThemeOption[] = [
  {
    key: "tide",
    name: "Tide",
    personality: "Calm, hopeful and consistent",
    color: "#35d9cd",
    assetPath: "/mascots/tide.png",
  },
  {
    key: "ember",
    name: "Ember",
    personality: "Bright, bold and ambitious",
    color: "#ff9d66",
    assetPath: "/mascots/ember.png",
  },
  {
    key: "grove",
    name: "Grove",
    personality: "Grounded, patient and growing",
    color: "#91d26f",
    assetPath: "/mascots/grove.png",
  },
  {
    key: "nova",
    name: "Nova",
    personality: "Curious, adventurous and dreamy",
    color: "#75a7ff",
    assetPath: "/mascots/nova.png",
  },
  {
    key: "moon",
    name: "Moon",
    personality: "Thoughtful, gentle and careful",
    color: "#d8c9ff",
    assetPath: "/mascots/moon.png",
  },
  {
    key: "aurora",
    name: "Aurora",
    personality: "Playful, optimistic and surprising",
    color: "#6ee7b7",
    assetPath: "/mascots/aurora.png",
  },
];

const storageKey = "savepixie.pixie-theme";
export const pixieThemeChangeEvent = "savepixie:pixie-theme-change";

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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<PixieTheme>(pixieThemeChangeEvent, { detail: theme }));
  }
}

export function getPixieThemeOption(theme: PixieTheme): PixieThemeOption {
  return pixieThemes.find((option) => option.key === theme) ?? pixieThemes[0];
}
