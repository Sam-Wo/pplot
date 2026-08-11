// Summary statistics (Appendix C). The spec allows jStat or a tiny inverse-t;
// we hand-roll the inverse-t so there is one fewer dependency to vet.

export interface Summary {
  n: number;
  mean: number;
  sd: number;
  sem: number;
  ci95: number; // half-width of the 95% CI (t-based)
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

// Lanczos approximation of ln Γ(x).
function logGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Continued-fraction expansion for the incomplete beta (Numerical Recipes).
function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const EPS = 3e-12;
  const MAXIT = 200;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a, b). Exported: it underlies the t and F
// tail probabilities used by lib/tests.ts.
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Student's t CDF.
function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const half = 0.5 * betai(df / 2, 0.5, x);
  return t > 0 ? 1 - half : half;
}

// Inverse Student's t (quantile), by bisection on the CDF.
export function tInv(p: number, df: number): number {
  if (df <= 0 || p <= 0 || p >= 1) return NaN;
  let lo = -1000;
  let hi = 1000;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Linear-interpolation quantile (R type 7 / numpy default) on an ascending array.
export function quantile(sortedAsc: number[], q: number): number {
  const n = sortedAsc.length;
  if (n === 0) return NaN;
  if (n === 1) return sortedAsc[0];
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedAsc[base + 1];
  return next !== undefined ? sortedAsc[base] + rest * (next - sortedAsc[base]) : sortedAsc[base];
}

export function summarize(vals: number[]): Summary {
  const a = vals.filter((v): v is number => Number.isFinite(v));
  const n = a.length;
  const mean = n ? a.reduce((s, x) => s + x, 0) / n : NaN;
  const sd = n > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const sem = n > 1 ? sd / Math.sqrt(n) : 0;
  const ci95 = n > 1 ? tInv(0.975, n - 1) * sem : 0;
  const sorted = [...a].sort((x, y) => x - y);
  return {
    n,
    mean,
    sd,
    sem,
    ci95,
    median: quantile(sorted, 0.5),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    min: n ? sorted[0] : NaN,
    max: n ? sorted[n - 1] : NaN,
  };
}

// Per-row z-score for heatmap normalization; rows with zero variance map to 0.
export function zscore(row: number[]): number[] {
  const a = row.filter((v) => Number.isFinite(v));
  const n = a.length;
  if (n === 0) return row.map(() => NaN);
  const mean = a.reduce((s, x) => s + x, 0) / n;
  const sd = n > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  return row.map((v) => (Number.isFinite(v) && sd > 0 ? (v - mean) / sd : Number.isFinite(v) ? 0 : NaN));
}
