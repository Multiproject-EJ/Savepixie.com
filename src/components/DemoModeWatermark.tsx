export function DemoModeWatermark() {
  if (import.meta.env.VITE_APP_MODE === "live") return null;

  return (
    <div className="demo-mode-watermark" aria-hidden="true">
      <span className="demo-mode-watermark__text">DEMO MODE</span>
      <span className="demo-mode-watermark__badge">SavePixie demo · no live payments</span>
    </div>
  );
}

export default DemoModeWatermark;
