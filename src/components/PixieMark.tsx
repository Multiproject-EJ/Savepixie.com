import { useEffect, useState } from "react";
import {
  getPixieThemeOption,
  getRememberedPixieTheme,
  isPixieTheme,
  pixieThemeChangeEvent,
  type PixieTheme,
} from "../features/profile/pixieThemes";

type PixieMarkProps = {
  size?: "small" | "medium" | "large";
  mood?: "calm" | "curious" | "happy";
  theme?: PixieTheme;
};

export function PixieMark({ size = "medium", mood = "calm", theme }: PixieMarkProps) {
  const [rememberedTheme, setRememberedTheme] = useState<PixieTheme>(getRememberedPixieTheme);

  useEffect(() => {
    if (theme) return;

    const syncTheme = (event: Event) => {
      const nextTheme = (event as CustomEvent<unknown>).detail;
      if (isPixieTheme(nextTheme)) setRememberedTheme(nextTheme);
    };

    window.addEventListener(pixieThemeChangeEvent, syncTheme);
    return () => window.removeEventListener(pixieThemeChangeEvent, syncTheme);
  }, [theme]);

  const activeTheme = theme ?? rememberedTheme;
  const themeOption = getPixieThemeOption(activeTheme);

  return (
    <span
      className={`pixie-mark pixie-mark--${size} pixie-mark--${mood}`}
      data-pixie-variant={activeTheme}
      aria-hidden="true"
    >
      <img
        className="pixie-art"
        src={themeOption.assetPath}
        alt=""
        width="1254"
        height="1254"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

export default PixieMark;
