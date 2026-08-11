// Trendlines for scatter (§7). Ordinary least-squares line with R², and a
// locally-weighted (LOESS) smoother. Pure numeric helpers, no plotting.

export interface LinearFit {
  m: number; // slope
  b: number; // intercept
  r2: number;
  predict: (x: number) => number;
}

// Pair up finite (x, y) values.
export function finitePairs(xs: number[], ys: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const n = Math.min(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) out.push([xs[i], ys[i]]);
  }
  return out;
}

export function linearFit(xs: number[], ys: number[]): LinearFit | null {
  const p = finitePairs(xs, ys);
  const n = p.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of p) {
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  // R² = squared Pearson correlation.
  const rDenom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  const r = rDenom === 0 ? 0 : (n * sxy - sx * sy) / rDenom;
  return { m, b, r2: r * r, predict: (x: number) => m * x + b };
}

// Tricube weight for LOESS.
function tricube(u: number): number {
  const a = 1 - Math.abs(u) ** 3;
  return a > 0 ? a ** 3 : 0;
}

// LOESS (degree-1 local regression). Returns smoothed points sorted by x.
// span is the fraction of points included in each local neighborhood.
export function loess(
  xs: number[],
  ys: number[],
  span = 0.6,
  steps = 60
): Array<[number, number]> {
  const p = finitePairs(xs, ys).sort((a, b) => a[0] - b[0]);
  const n = p.length;
  if (n < 3) return p;
  const k = Math.max(2, Math.min(n, Math.floor(span * n)));
  const xmin = p[0][0];
  const xmax = p[n - 1][0];
  if (xmax === xmin) return p;

  const out: Array<[number, number]> = [];
  for (let s = 0; s <= steps; s++) {
    const x0 = xmin + ((xmax - xmin) * s) / steps;
    // k nearest neighbors by |x - x0|.
    const dist = p.map(([x]) => Math.abs(x - x0)).sort((a, b) => a - b);
    const h = dist[k - 1] || 1e-9;
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (const [x, y] of p) {
      const w = tricube((x - x0) / h);
      if (w === 0) continue;
      sw += w;
      swx += w * x;
      swy += w * y;
      swxx += w * x * x;
      swxy += w * x * y;
    }
    const denom = sw * swxx - swx * swx;
    let yhat: number;
    if (denom === 0 || sw === 0) {
      yhat = sw === 0 ? 0 : swy / sw;
    } else {
      const m = (sw * swxy - swx * swy) / denom;
      const b = (swy - m * swx) / sw;
      yhat = m * x0 + b;
    }
    out.push([x0, yhat]);
  }
  return out;
}

// Compact equation string for a linear fit.
export function equationText(fit: LinearFit): string {
  const sign = fit.b >= 0 ? '+' : '−';
  const fmt = (v: number) => Number(v.toPrecision(3)).toString();
  return `y = ${fmt(fit.m)}x ${sign} ${fmt(Math.abs(fit.b))}`;
}
