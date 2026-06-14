import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";

const SOURCE = path.join(process.cwd(), "public/assets/stone-gods-logo.png");
const SIZES = [512, 192, 32] as const;

async function circularPng(input: string, size: number, output: string) {
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );

  await sharp(input)
    .resize(size, size, { fit: "cover", position: "centre" })
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toFile(output);
}

async function main() {
  await mkdir(path.join(process.cwd(), "app"), { recursive: true });

  for (const size of SIZES) {
    const out =
      size === 512
        ? path.join(process.cwd(), "app/icon.png")
        : path.join(process.cwd(), `app/icon-${size}.png`);
    await circularPng(SOURCE, size, out);
    console.log(`Wrote ${out}`);
  }

  await circularPng(
    SOURCE,
    40,
    path.join(process.cwd(), "public/assets/stone-gods-thumb.png"),
  );
  console.log("Wrote public/assets/stone-gods-thumb.png");

  await circularPng(
    SOURCE,
    180,
    path.join(process.cwd(), "app/apple-icon.png"),
  );
  console.log("Wrote app/apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
