import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const themes = ["tide", "ember", "grove", "nova", "moon", "aurora"];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

for (const theme of themes) {
  const path = resolve("public", "mascots", `${theme}.png`);
  const image = await readFile(path);

  if (!image.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${theme}.png is not a valid PNG.`);
  }

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  const colorType = image.readUInt8(25);

  if (width < 512 || height < 512) {
    throw new Error(`${theme}.png is too small for production use (${width}×${height}).`);
  }

  if (colorType !== 6) {
    throw new Error(`${theme}.png must be RGBA so its background stays transparent.`);
  }
}

console.log(`Verified ${themes.length} transparent production Pixie assets.`);
