import type { PixieTheme } from "../features/profile/pixieThemes";

type PixieMarkProps = {
  size?: "small" | "medium" | "large";
  mood?: "calm" | "curious" | "happy";
  theme?: PixieTheme;
};

export function PixieMark({ size = "medium", mood = "calm", theme }: PixieMarkProps) {
  return (
    <span
      className={`pixie-mark pixie-mark--${size} pixie-mark--${mood}`}
      data-pixie-variant={theme}
      aria-hidden="true"
    >
      <span className="pixie-wing pixie-wing--left" />
      <span className="pixie-wing pixie-wing--right" />
      <span className="pixie-hood">
        <span className="pixie-face">
          <span className="pixie-eye pixie-eye--left" />
          <span className="pixie-eye pixie-eye--right" />
          <span className="pixie-star">✦</span>
        </span>
      </span>
      <span className="pixie-seed">◆</span>
    </span>
  );
}

export default PixieMark;
