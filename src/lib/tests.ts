// Hypothesis tests (opt-in scope beyond the spec's visualization-only default).
// Two-sample & paired t-tests, one-way ANOVA, Pearson/Spearman correlation.
// Tail probabilities come from the regularized incomplete beta in stats.ts.

import { betai } from './stats';

function finite(a: number[]): number[] {
  return a.filter((v) => Number.isFinite(v));
}
function mean(a: number[]): number {
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function variance(a: number[]): number {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
}

// Two-tailed p for Student's t: P(|T| > |t|) = I_x(df/2, 1/2), x = df/(df+t²).
export function tTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return NaN;
  return betai(df / 2, 0.5, df / (df + t * t));
}

// Upper-tail p for the F distribution: P(F > f) = I_y(d2/2, d1/2), y = d2/(d2+d1·f).
export function fUpperP(f: number, d1: number, d2: number): number {
  if (d1 <= 0 || d2 <= 0 || Number.isNaN(f)) return NaN;
  if (f <= 0) return 1;
  if (!Number.isFinite(f)) return 0; // infinite F (zero within-group variance) → p → 0
  return betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}

export interface TTestResult {
  t: number;
  df: number;
  p: number;
  meanDiff: number;
}

// Two-sample t-test. Welch (unequal variance) by default; Student when equalVar.
export function tTestTwoSample(
  a: number[],
  b: number[],
  opts: { equalVar?: boolean } = {}
): TTestResult | null {
  const A = finite(a);
  const B = finite(b);
  const n1 = A.length;
  const n2 = B.length;
  if (n1 < 2 || n2 < 2) return null;
  const m1 = mean(A);
  const m2 = mean(B);
  const v1 = variance(A);
  const v2 = variance(B);
  const diff = m1 - m2;

  if (opts.equalVar) {
    const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    const df = n1 + n2 - 2;
    const t = se === 0 ? 0 : diff / se;
    return { t, df, p: tTwoTailedP(t, df), meanDiff: diff };
  }
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = se === 0 ? 0 : diff / se;
  // Welch–Satterthwaite degrees of freedom.
  const df =
    (v1 / n1 + v2 / n2) ** 2 /
    ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  return { t, df, p: tTwoTailedP(t, df), meanDiff: diff };
}

// Paired t-test on complete pairs.
export function tTestPaired(a: number[], b: number[]): TTestResult | null {
  const d: number[] = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) d.push(a[i] - b[i]);
  }
  if (d.length < 2) return null;
  const md = mean(d);
  const se = Math.sqrt(variance(d) / d.length);
  const df = d.length - 1;
  const t = se === 0 ? 0 : md / se;
  return { t, df, p: tTwoTailedP(t, df), meanDiff: md };
}

export interface AnovaResult {
  f: number;
  df1: number;
  df2: number;
  p: number;
}

// One-way ANOVA across ≥2 groups.
export function anova(groups: number[][]): AnovaResult | null {
  const g = groups.map(finite).filter((x) => x.length > 0);
  const k = g.length;
  if (k < 2) return null;
  const all = g.flat();
  const N = all.length;
  const grand = mean(all);
  let ssb = 0;
  let ssw = 0;
  for (const x of g) {
    const m = mean(x);
    ssb += x.length * (m - grand) ** 2;
    for (const v of x) ssw += (v - m) ** 2;
  }
  const df1 = k - 1;
  const df2 = N - k;
  if (df2 <= 0) return null;
  const msb = ssb / df1;
  const msw = ssw / df2;
  const f = msw === 0 ? Infinity : msb / msw;
  return { f, df1, df2, p: fUpperP(f, df1, df2) };
}

export interface CorrResult {
  r: number;
  p: number;
  n: number;
}

function pearsonR(x: number[], y: number[]): { r: number; n: number } | null {
  const px: number[] = [];
  const py: number[] = [];
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(x[i]) && Number.isFinite(y[i])) {
      px.push(x[i]);
      py.push(y[i]);
    }
  }
  const m = px.length;
  if (m < 3) return null;
  const mx = mean(px);
  const my = mean(py);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < m; i++) {
    sxy += (px[i] - mx) * (py[i] - my);
    sxx += (px[i] - mx) ** 2;
    syy += (py[i] - my) ** 2;
  }
  const denom = Math.sqrt(sxx * syy);
  return { r: denom === 0 ? 0 : sxy / denom, n: m };
}

export function pearson(x: number[], y: number[]): CorrResult | null {
  const res = pearsonR(x, y);
  if (!res) return null;
  const { r, n } = res;
  const t = r * Math.sqrt((n - 2) / Math.max(1 - r * r, 1e-12));
  return { r, n, p: tTwoTailedP(t, n - 2) };
}

// Fractional ranks with ties averaged.
function ranks(a: number[]): number[] {
  const idx = a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const out = new Array<number>(a.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; // 1-based average rank
    for (let k = i; k <= j; k++) out[idx[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

export function spearman(x: number[], y: number[]): CorrResult | null {
  const px: number[] = [];
  const py: number[] = [];
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(x[i]) && Number.isFinite(y[i])) {
      px.push(x[i]);
      py.push(y[i]);
    }
  }
  if (px.length < 3) return null;
  return pearson(ranks(px), ranks(py));
}

// p → conventional star notation, and a compact display label.
export function pStars(p: number): string {
  if (!Number.isFinite(p)) return 'ns';
  if (p <= 0.0001) return '****';
  if (p <= 0.001) return '***';
  if (p <= 0.01) return '**';
  if (p <= 0.05) return '*';
  return 'ns';
}

export function pLabel(p: number): string {
  if (!Number.isFinite(p)) return 'p = n/a';
  if (p < 0.001) return 'p < 0.001';
  return `p = ${p < 0.01 ? p.toFixed(4) : p.toFixed(3)}`;
}
