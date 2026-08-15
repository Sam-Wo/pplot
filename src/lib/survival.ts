// Kaplan–Meier product-limit estimator with Greenwood-variance confidence
// bands (for the survival plot). Pure numeric — no plotting.

export interface KMStep {
  time: number;
  survival: number; // S(t) after this time
  atRisk: number; // n_i just before this time
  events: number; // d_i at this time
  lower: number; // 95% CI lower (clamped to [0,1])
  upper: number; // 95% CI upper
}

export interface KMCurve {
  steps: KMStep[];
  censorTimes: number[]; // times with a censoring but (possibly) no event
  median: number | null; // first time S(t) ≤ 0.5, or null if never reached
}

export interface SurvivalObs {
  time: number;
  event: boolean; // true = event occurred, false = censored
}

// Compute the KM curve from time/event observations. z = 1.96 → 95% CI.
export function kaplanMeier(obs: SurvivalObs[], z = 1.96): KMCurve {
  const clean = obs.filter((o) => Number.isFinite(o.time) && o.time >= 0).sort((a, b) => a.time - b.time);
  const n = clean.length;
  const steps: KMStep[] = [];
  const censorTimes: number[] = [];
  if (n === 0) return { steps, censorTimes, median: null };

  // Unique times, in order.
  const uniqueTimes = [...new Set(clean.map((o) => o.time))].sort((a, b) => a - b);
  let atRisk = n;
  let survival = 1;
  let greenwood = 0; // running sum of d/(n(n-d))
  let median: number | null = null;

  for (const t of uniqueTimes) {
    const atThis = clean.filter((o) => o.time === t);
    const d = atThis.filter((o) => o.event).length;
    const c = atThis.length - d;
    if (c > 0) censorTimes.push(t);

    if (d > 0) {
      survival *= 1 - d / atRisk;
      greenwood += d / (atRisk * (atRisk - d) || Infinity);
      const se = survival * Math.sqrt(greenwood);
      const lower = Math.max(0, survival - z * se);
      const upper = Math.min(1, survival + z * se);
      steps.push({ time: t, survival, atRisk, events: d, lower, upper });
      if (median === null && survival <= 0.5) median = t;
    }
    atRisk -= atThis.length;
  }
  return { steps, censorTimes, median };
}

// Build step-function arrays (x, y) for plotting, starting at (0, 1). Uses the
// survival value carried forward between event times; Plotly's 'hv' line shape
// draws the actual steps.
export function survivalStepArrays(curve: KMCurve): { x: number[]; y: number[] } {
  const x: number[] = [0];
  const y: number[] = [1];
  for (const s of curve.steps) {
    x.push(s.time);
    y.push(s.survival);
  }
  return { x, y };
}

// Survival value at an arbitrary time (right-continuous step lookup).
export function survivalAt(curve: KMCurve, t: number): number {
  let s = 1;
  for (const step of curve.steps) {
    if (step.time <= t) s = step.survival;
    else break;
  }
  return s;
}
