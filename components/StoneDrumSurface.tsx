type StoneDrumSurfaceProps = {
  reelIdx: number;
  height: number;
};

/** Procedural stone drum face — lit noise surface. No raster assets. */
export default function StoneDrumSurface({ reelIdx, height }: StoneDrumSurfaceProps) {
  const id = `drum-${reelIdx}`;
  const seed = 3 + reelIdx * 7;

  return (
    <svg className="stone-drum__svg" viewBox={`0 0 144 ${height}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <filter id={`${id}-rock`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.042 0.065" numOctaves="5" seed={seed} stitchTiles="stitch" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.72  0 0 0 0 0.68  0 0 0 0 0.62  0 0 0 1 0"
            result="tint"
          />
          <feDiffuseLighting in="noise" surfaceScale="2.8" lightingColor="#ddd5cb" result="light">
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feBlend in="light" in2="tint" mode="multiply" result="surface" />
          <feGaussianBlur in="surface" stdDeviation="0.35" result="soft" />
        </filter>
      </defs>

      <rect width="144" height={height} fill="#b8afa5" filter={`url(#${id}-rock)`} />
    </svg>
  );
}
