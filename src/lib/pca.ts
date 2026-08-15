// Principal component analysis for the PCA scatter plot. Rows are observations,
// columns are features. Fully client-side: covariance/correlation matrix +
// a Jacobi eigen-decomposition (symmetric, deterministic — no randomness, so it
// respects the "stable output on redraw" principle).

export interface PCAResult {
  scores: number[][]; // [observation][component] projected coordinates
  loadings: number[][]; // [feature][component] eigenvector weights
  explained: number[]; // fraction of variance per component (descending)
  featureNames: string[];
  keptRows: number[]; // original row indices that were complete
}

// Jacobi eigenvalue algorithm for a real symmetric matrix. Returns eigenvalues
// and eigenvectors (as columns of `vectors`), sorted by descending eigenvalue.
export function jacobiEigen(
  input: number[][],
  maxSweeps = 100
): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  const offDiag = () => {
    let s = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) s += a[i][j] * a[i][j];
    return s;
  };

  for (let sweep = 0; sweep < maxSweeps && offDiag() > 1e-18; sweep++) {
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        // Rotate rows/cols p,q.
        for (let i = 0; i < n; i++) {
          const aip = a[i][p];
          const aiq = a[i][q];
          a[i][p] = c * aip - s * aiq;
          a[i][q] = s * aip + c * aiq;
        }
        for (let i = 0; i < n; i++) {
          const api = a[p][i];
          const aqi = a[q][i];
          a[p][i] = c * api - s * aqi;
          a[q][i] = s * api + c * aqi;
        }
        for (let i = 0; i < n; i++) {
          const vip = v[i][p];
          const viq = v[i][q];
          v[i][p] = c * vip - s * viq;
          v[i][q] = s * vip + c * viq;
        }
      }
    }
  }

  const values = a.map((row, i) => row[i]);
  const order = values.map((_, i) => i).sort((x, y) => values[y] - values[x]);
  return {
    values: order.map((i) => values[i]),
    vectors: v.map((row) => order.map((i) => row[i])),
  };
}

// Run PCA over a data matrix. `standardize` divides each feature by its SD
// (correlation PCA) so features on different scales contribute comparably.
export function pca(
  data: (number | null)[][], // [row][feature]
  featureNames: string[],
  opts: { standardize?: boolean; components?: number } = {}
): PCAResult | null {
  const standardize = opts.standardize ?? true;
  const nFeat = featureNames.length;
  // Keep only rows with all features present.
  const keptRows: number[] = [];
  const X: number[][] = [];
  data.forEach((row, r) => {
    if (row.length >= nFeat && row.slice(0, nFeat).every((v) => typeof v === 'number' && Number.isFinite(v))) {
      keptRows.push(r);
      X.push(row.slice(0, nFeat) as number[]);
    }
  });
  const n = X.length;
  if (n < 3 || nFeat < 2) return null;

  // Center (and optionally scale) each column.
  const means = new Array(nFeat).fill(0);
  for (const row of X) for (let j = 0; j < nFeat; j++) means[j] += row[j] / n;
  const sds = new Array(nFeat).fill(0);
  for (const row of X) for (let j = 0; j < nFeat; j++) sds[j] += (row[j] - means[j]) ** 2;
  for (let j = 0; j < nFeat; j++) sds[j] = Math.sqrt(sds[j] / (n - 1)) || 1;
  const Z = X.map((row) => row.map((v, j) => (v - means[j]) / (standardize ? sds[j] : 1)));

  // Covariance (or correlation) matrix ZᵀZ / (n-1).
  const C: number[][] = Array.from({ length: nFeat }, () => new Array(nFeat).fill(0));
  for (const row of Z) {
    for (let i = 0; i < nFeat; i++) for (let j = i; j < nFeat; j++) C[i][j] += (row[i] * row[j]) / (n - 1);
  }
  for (let i = 0; i < nFeat; i++) for (let j = i; j < nFeat; j++) C[j][i] = C[i][j];

  const { values, vectors } = jacobiEigen(C);
  const totalVar = values.reduce((s, v) => s + Math.max(v, 0), 0) || 1;
  const k = Math.min(opts.components ?? nFeat, nFeat);

  // Scores = Z · V (project each observation onto the components).
  const scores = Z.map((row) =>
    Array.from({ length: k }, (_, comp) => {
      let s = 0;
      for (let j = 0; j < nFeat; j++) s += row[j] * vectors[j][comp];
      return s;
    })
  );
  const loadings = vectors.map((row) => row.slice(0, k));
  const explained = values.slice(0, k).map((val) => Math.max(val, 0) / totalVar);
  return { scores, loadings, explained, featureNames, keptRows };
}
