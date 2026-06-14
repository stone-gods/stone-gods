/**
 * Remove background by flood-filling from image edges only.
 * Preserves interior white highlights / dark details that aren't connected to the border.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

type Options = {
  white?: boolean;
  black?: boolean;
  whiteMin?: number;
  blackMax?: number;
};

function isBackground(r: number, g: number, b: number, opts: Options): boolean {
  const whiteMin = opts.whiteMin ?? 232;
  const blackMax = opts.blackMax ?? 28;
  if (opts.white && r > whiteMin && g > whiteMin && b > whiteMin) return true;
  if (opts.black && r < blackMax && g < blackMax && b < blackMax) return true;
  return false;
}

function removeEdgeBackground(data: Buffer, width: number, height: number, opts: Options): number {
  const size = width * height;
  const visited = new Uint8Array(size);
  const queue: number[] = [];

  for (let x = 0; x < width; x++) {
    queue.push(x, (height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width, y * width + width - 1);
  }

  let count = 0;

  while (queue.length > 0) {
    const idx = queue.pop()!;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pi = idx * 4;
    const r = data[pi]!;
    const g = data[pi + 1]!;
    const b = data[pi + 2]!;
    if (!isBackground(r, g, b, opts)) continue;

    data[pi + 3] = 0;
    count++;

    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }

  return count;
}

async function copyPng(src: string, out: string) {
  await sharp(src).png().toFile(out);
  const { width, height } = await sharp(out).metadata();
  console.log(`${path.basename(out)}: copied ${width}x${height} (kept original alpha)`);
}

async function processSymbol(src: string, out: string, opts: Options) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = removeEdgeBackground(data, info.width, info.height, opts);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(out);
  console.log(`${path.basename(out)}: ${info.width}x${info.height}, ${count} edge-bg px removed`);
}

const assetsDir = process.argv[2];
if (!assetsDir) {
  console.error("Usage: tsx scripts/process-symbols.ts <assets-dir>");
  process.exit(1);
}

const outDir = "public/assets/symbols";
fs.mkdirSync(outDir, { recursive: true });

const jobs: Array<{ src: string; out: string; mode: "copy" | "process"; opts?: Options }> = [
  {
    src: path.join(assetsDir, "IMG_0943-863e4aeb-8928-4541-87dc-cc9b1895964f.png"),
    out: path.join(outDir, "blue-gem.png"),
    mode: "copy",
  },
  {
    src: path.join(assetsDir, "IMG_0944-b451482f-392c-47c2-95c5-780f92b09a95.png"),
    out: path.join(outDir, "amber-gem.png"),
    mode: "copy",
  },
  {
    src: path.join(assetsDir, "IMG_0940-fe495a78-2946-46e3-a102-eafd1db874ed.png"),
    out: path.join(outDir, "gold-coin.png"),
    mode: "process",
    opts: { white: true, black: false },
  },
  {
    src: path.join(assetsDir, "IMG_0934-24003644-9775-483e-8650-8cc70692035d.png"),
    out: path.join(outDir, "stone-face.png"),
    mode: "process",
    opts: { white: true, black: true },
  },
  {
    src: path.join(assetsDir, "IMG_0932_2-976c7606-347e-41e5-bea1-1411ed37f96a.png"),
    out: path.join(outDir, "stone-god.png"),
    mode: "process",
    opts: { white: false, black: true },
  },
  {
    src: path.join(assetsDir, "IMG_0936-ea4518db-b25a-4618-a5cf-23d39b3c9bcd.png"),
    out: path.join(outDir, "wolf-warrior.png"),
    mode: "copy",
  },
];

async function main() {
  for (const job of jobs) {
    if (!fs.existsSync(job.src)) {
      console.warn(`Skip missing: ${job.src}`);
      continue;
    }
    if (job.mode === "copy") await copyPng(job.src, job.out);
    else await processSymbol(job.src, job.out, job.opts ?? {});
  }
}

void main();
