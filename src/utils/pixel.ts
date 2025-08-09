export const noSmooth = (ctx: CanvasRenderingContext2D | null | undefined) => {
  if (!ctx) return;
  try {
    ctx.imageSmoothingEnabled = false;
  } catch {}
};

export const snapX = (ctx: CanvasRenderingContext2D, x: number) => {
  const m = ctx.getTransform();
  const sx = m.a || 1;
  return Math.round(x * sx) / sx;
};

export const snapY = (ctx: CanvasRenderingContext2D, y: number) => {
  const m = ctx.getTransform();
  const sy = m.d || 1;
  return Math.round(y * sy) / sy;
};

export const snapPoint = (ctx: CanvasRenderingContext2D, x: number, y: number) => ({
  x: snapX(ctx, x),
  y: snapY(ctx, y),
});
