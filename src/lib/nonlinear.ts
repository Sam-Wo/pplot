// Levenberg–Marquardt nonlinear least squares (for the 4PL dose–response fit).
// Numerical Jacobian (central differences) — robust for a handful of parameters
// and points, and avoids hand-derived derivatives.

export interface LMResult {
  params: number[];
  sse: number;
  r2: number;
  iterations: number;
  converged: boolean;
}

// Gaussian elimination with partial pivoting. Solves A·x = b (n×n). null if singular.
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-15) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export function levenbergMarquardt(
  xs: number[],
  ys: number[],
  model: (x: number, p: number[]) => number,
  init: number[],
  opts: { maxIter?: number; tol?: number } = {}
): LMResult {
  const maxIter = opts.maxIter ?? 300;
  const tol = opts.tol ?? 1e-10;
  const np = init.length;
  const n = xs.length;
  const p = init.slice();

  const residuals = (pp: number[]) => xs.map((x, i) => ys[i] - model(x, pp));
  const sse = (r: number[]) => r.reduce((s, v) => s + v * v, 0);

  let r = residuals(p);
  let cost = sse(r);
  let lambda = 1e-3;
  let converged = false;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    // Numerical Jacobian J[i][j] = ∂model/∂p_j at x_i.
    const J = xs.map(() => new Array(np).fill(0));
    for (let j = 0; j < np; j++) {
      const h = Math.max(1e-7, Math.abs(p[j]) * 1e-6);
      const pu = p.slice();
      const pd = p.slice();
      pu[j] += h;
      pd[j] -= h;
      for (let i = 0; i < n; i++) J[i][j] = (model(xs[i], pu) - model(xs[i], pd)) / (2 * h);
    }
    // Normal equations: (JᵀJ + λ·diag)·δ = Jᵀr  (r = y − f).
    const JtJ = Array.from({ length: np }, () => new Array(np).fill(0));
    const Jtr = new Array(np).fill(0);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < np; a++) {
        Jtr[a] += J[i][a] * r[i];
        for (let b = 0; b < np; b++) JtJ[a][b] += J[i][a] * J[i][b];
      }
    }

    let stepped = false;
    for (let attempt = 0; attempt < 14; attempt++) {
      const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lambda) : v)));
      const delta = solve(A, Jtr);
      if (!delta) {
        lambda *= 10;
        continue;
      }
      const pn = p.map((v, i) => v + delta[i]);
      const rn = residuals(pn);
      const cn = sse(rn);
      if (cn < cost) {
        const improved = cost - cn;
        for (let i = 0; i < np; i++) p[i] = pn[i];
        r = rn;
        cost = cn;
        lambda = Math.max(lambda / 3, 1e-12);
        stepped = true;
        if (improved < tol * (1 + cost)) converged = true;
        break;
      }
      lambda *= 3;
    }
    if (!stepped || converged) break;
  }

  const ybar = ys.reduce((s, v) => s + v, 0) / n;
  const sstot = ys.reduce((s, v) => s + (v - ybar) ** 2, 0);
  const r2 = sstot > 0 ? 1 - cost / sstot : 0;
  return { params: p, sse: cost, r2, iterations: iter, converged };
}
