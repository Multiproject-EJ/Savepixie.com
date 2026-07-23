import type { CSSProperties } from "react";
import PixieMark from "./PixieMark";
import { pixieThemes, type PixieTheme } from "../features/profile/pixieThemes";

type PixieThemePickerProps = {
  value: PixieTheme;
  onChange: (theme: PixieTheme) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function PixieThemePicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: PixieThemePickerProps) {
  return (
    <div
      className={compact ? "pixie-theme-grid pixie-theme-grid--compact" : "pixie-theme-grid"}
      role="radiogroup"
      aria-label="Choose your SavePixie"
    >
      {pixieThemes.map((theme) => (
        <button
          className={theme.key === value ? "pixie-theme-card selected" : "pixie-theme-card"}
          style={
            {
              "--theme-preview": theme.color,
            } as CSSProperties
          }
          type="button"
          role="radio"
          aria-checked={theme.key === value}
          key={theme.key}
          onClick={() => onChange(theme.key)}
          disabled={disabled}
        >
          <span className="pixie-theme-card__preview" data-pixie-preview={theme.key}>
            <PixieMark size={compact ? "small" : "medium"} mood="happy" theme={theme.key} />
          </span>
          <span className="pixie-theme-card__copy">
            <em>{theme.world}</em>
            <strong>{theme.name}</strong>
            <small>{theme.personality}</small>
          </span>
          <span className="pixie-theme-card__check" aria-hidden="true">
            ✓
          </span>
        </button>
      ))}
    </div>
  );
}

export default PixieThemePicker;
