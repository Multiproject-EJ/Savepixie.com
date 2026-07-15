export type HapticStrength = "light" | "success";

export function gentleHaptic(strength: HapticStrength = "light") {
  if (!("vibrate" in navigator)) return;

  const pattern = strength === "success" ? [18, 45, 28] : 10;
  navigator.vibrate(pattern);
}
