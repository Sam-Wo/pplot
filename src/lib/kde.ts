// Gaussian kernel density estimate for the histogram density overlay (§7).

import { quantile } from './stats';

// Silverman's rule-of-thumb bandwidth, robust via the IQR.
export function silvermanBandwidth(a: number[]): number {
  const n = a.length;
  if (n < 2) return 1;
  const m = a.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
  const sorted = [...a].sort((x, y) => x - y);
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const sigma = Math.min(sd || Infinity, iqr / 1.349 || Infinity);
  return 0.9 * (Number.isFinite(sigma) ? sigma : sd || 1) * Math.pow(n, -0.2) || 1;
}

// KDE over a padded grid. Returns density [x, y] pairs (integrates to ~1).
export function kde(values: number[], grid = 64): Array<[number, number]> {
  const data = values.filter((v) => Number.isFinite(v));
  const n = data.length;
  if (n < 2) return [];
  const h = silvermanBandwidth(data);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = h * 3;
  const lo = min - pad;
  const hi = max + pad;
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= grid; i++) {
    const x = lo + ((hi - lo) * i) / grid;
    let s = 0;
    for (const d of data) {
      const u = (x - d) / h;
      s += Math.exp(-0.5 * u * u);
    }
    out.push([x, s / (n * h * Math.sqrt(2 * Math.PI))]);
  }
  return out;
}

// Sturges' rule for a default bin count.
export function sturgesBins(n: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(n, 1)) + 1));
}
