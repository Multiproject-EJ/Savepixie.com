"""Build installable SavePixie app icons from the production Tide mascot."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
MASCOT_PATH = ROOT / "public" / "mascots" / "tide.png"
ICON_DIR = ROOT / "public" / "icons"


def build_icon(size: int, mascot_scale: float) -> Image.Image:
    background = Image.new("RGB", (size, size))
    pixels = background.load()

    for y in range(size):
        for x in range(size):
            distance = (((x - size * 0.5) ** 2 + (y - size * 0.46) ** 2) ** 0.5) / size
            glow = max(0.0, 1.0 - distance * 2.1)
            pixels[x, y] = (
                round(10 + glow * 25),
                round(7 + glow * 21),
                round(26 + glow * 51),
            )

    glow_layer = Image.new("RGBA", (size, size))
    glow_draw = ImageDraw.Draw(glow_layer)
    radius = round(size * 0.34)
    center_x = size // 2
    center_y = round(size * 0.5)
    glow_draw.ellipse(
        (
            center_x - radius,
            center_y - radius,
            center_x + radius,
            center_y + radius,
        ),
        fill=(108, 200, 255, 75),
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(round(size * 0.12)))

    canvas = background.convert("RGBA")
    canvas.alpha_composite(glow_layer)

    mascot = Image.open(MASCOT_PATH).convert("RGBA")
    mascot_size = round(size * mascot_scale)
    mascot.thumbnail((mascot_size, mascot_size), Image.Resampling.LANCZOS)
    position = ((size - mascot.width) // 2, round((size - mascot.height) * 0.49))
    canvas.alpha_composite(mascot, position)

    return canvas.convert("RGB")


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    build_icon(512, 0.83).save(ICON_DIR / "icon-512x512.png", optimize=True)
    build_icon(512, 0.68).save(ICON_DIR / "icon-maskable-512x512.png", optimize=True)
    build_icon(192, 0.83).save(ICON_DIR / "icon-192x192.png", optimize=True)
    build_icon(180, 0.83).save(ICON_DIR / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    main()
