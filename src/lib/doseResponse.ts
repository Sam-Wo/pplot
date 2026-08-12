// Four-parameter logistic (Hill) dose–response fit and IC50/EC50 (§7 extension).
// Fit in log10(dose) space — the standard for dose–response — via LM.

import { levenbergMarquardt } from './nonlinear';

export interface FourPLFit {
  top: number; // asymptote as X → +∞ (high dose when hill > 0)
  bottom: number; // asymptote as X → −∞
  logIC50: number;
  hill: number; // Hill slope
  ic50: number; // 10^logIC50, in concentration units
  r2: number;
  lowDose: number; // fitted response at the lowest observed dose
  highDose: number; // fitted response at the highest observed dose
  ok: boolean;
}

// Model in log-dose space: X = log10(dose).
export function fourPL(X: number, top: number, bottom: number, logIC50: number, hill: number): number {
  return bottom + (top - bottom) / (1 + Math.pow(10, (logIC50 - X) * hill));
}

// Evaluate at an actual concentration.
export function fourPLDose(
  dose: number,
  top: number,
  bottom: number,
  logIC50: number,
  hill: number
): number {
  return fourPL(Math.log10(dose), top, bottom, logIC50, hill);
}

// Fit doses/responses. '3pl' fixes |Hill| = 1 (direction handled by the
// Top/Bottom assignment). Only positive doses are used (log axis).
export function fit4PL(
  doses: number[],
  responses: number[],
  opts: { model?: '4pl' | '3pl' } = {}
): FourPLFit | null {
  const X: number[] = [];
  const Y: number[] = [];
  const n = Math.min(doses.length, responses.length);
  for (let i = 0; i < n; i++) {
    const d = doses[i];
    const y = responses[i];
    if (d > 0 && Number.isFinite(d) && Number.isFinite(y)) {
      X.push(Math.log10(d));
      Y.push(y);
    }
  }
  if (X.length < 4) return null;

  const ymin = Math.min(...Y);
  const ymax = Math.max(...Y);
  const xmin = Math.min(...X);
  const xmax = Math.max(...X);
  const mx = X.reduce((s, v) => s + v, 0) / X.length;
  const my = Y.reduce((s, v) => s + v, 0) / Y.length;
  let sxy = 0;
  for (let i = 0; i < X.length; i++) sxy += (X[i] - mx) * (Y[i] - my);
  const increasing = sxy >= 0;

  // Init so that (with hill = +1) the curve already runs the right direction.
  const initTop = increasing ? ymax : ymin;
  const initBottom = increasing ? ymin : ymax;
  const init = [initTop, initBottom, (xmin + xmax) / 2, 1];

  const fixHill = opts.model === '3pl';
  // Free params: [top, bottom, logIC50] (+ hill for 4PL).
  const freeInit = fixHill ? init.slice(0, 3) : init.slice();
  const model = (x: number, pf: number[]) => {
    const hill = fixHill ? 1 : pf[3];
    return fourPL(x, pf[0], pf[1], pf[2], hill);
  };

  const res = levenbergMarquardt(X, Y, model, freeInit);
  const [top, bottom, logIC50] = res.params;
  const hill = fixHill ? 1 : res.params[3];
  if (!Number.isFinite(logIC50) || !Number.isFinite(top) || !Number.isFinite(bottom)) return null;

  return {
    top,
    bottom,
    logIC50,
    hill,
    ic50: Math.pow(10, logIC50),
    r2: res.r2,
    lowDose: fourPL(xmin, top, bottom, logIC50, hill),
    highDose: fourPL(xmax, top, bottom, logIC50, hill),
    ok: Number.isFinite(res.r2),
  };
}
