export const pixieThemeKeys = ["tide", "ember", "grove", "nova", "moon", "aurora"] as const;

export type PixieTheme = (typeof pixieThemeKeys)[number];

export type PixieThemeOption = {
  key: PixieTheme;
  name: string;
  world: string;
  suiteBridge:
    | "WalletHabit Classic"
    | "WalletHabit Growth"
    | "WalletHabit Linen"
    | "WalletHabit Midnight"
    | null;
  motionProfile: "fluid" | "radiant" | "organic" | "cosmic" | "gentle" | "bloom";
  personality: string;
  color: string;
  assetPath: string;
};

export const defaultPixieTheme: PixieTheme = "tide";

export const pixieThemes: PixieThemeOption[] = [
  {
    key: "tide",
    name: "Tide",
    world: "Classic Current",
    suiteBridge: "WalletHabit Classic",
    motionProfile: "fluid",
    personality: "Calm, hopeful and consistent",
    color: "#35d9cd",
    assetPath: "/mascots/tide.png",
  },
  {
    key: "ember",
    name: "Ember",
    world: "Sunset City",
    suiteBridge: null,
    motionProfile: "radiant",
    personality: "Bright, bold and ambitious",
    color: "#ff9d66",
    assetPath: "/mascots/ember.png",
  },
  {
    key: "grove",
    name: "Grove",
    world: "Growth Grove",
    suiteBridge: "WalletHabit Growth",
    motionProfile: "organic",
    personality: "Grounded, patient and growing",
    color: "#91d26f",
    assetPath: "/mascots/grove.png",
  },
  {
    key: "nova",
    name: "Nova",
    world: "Midnight City",
    suiteBridge: "WalletHabit Midnight",
    motionProfile: "cosmic",
    personality: "Curious, adventurous and dreamy",
    color: "#75a7ff",
    assetPath: "/mascots/nova.png",
  },
  {
    key: "moon",
    name: "Moon",
    world: "Linen Moon",
    suiteBridge: "WalletHabit Linen",
    motionProfile: "gentle",
    personality: "Thoughtful, gentle and careful",
    color: "#d8c9ff",
    assetPath: "/mascots/moon.png",
  },
  {
    key: "aurora",
    name: "Aurora",
    world: "Neon Bloom",
    suiteBridge: null,
    motionProfile: "bloom",
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
  const option = getPixieThemeOption(theme);
  document.documentElement.dataset.pixieTheme = theme;
  document.documentElement.dataset.pixieMotion = option.motionProfile;
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
