// 16-bit leaning palette and simple dither pattern helper
export const PIXEL_PALETTE = {
  iceBase: "#f2f8ff",
  iceShade: "#e6f2fc",
  boardEdge: "#0a1a2a",
};

// Creates a small checkerboard dither pattern
export function createDitherPattern(
  ctx: CanvasRenderingContext2D,
  colorA: string,
  colorB: string,
  size = 4,
): CanvasPattern | null {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const octx = off.getContext("2d");
  if (!octx) return null;
  // draw checkerboard
  octx.fillStyle = colorA;
  octx.fillRect(0, 0, size, size);
  octx.fillStyle = colorB;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x + y) % 2 === 0) {
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  return ctx.createPattern(off, "repeat");
}
