import type { Annotations, Layout, Shape } from 'plotly.js';
import type { PlotOptions } from '../data/types';
import type { Group } from '../data/mapping';
import { pLabel, pStars, tTestTwoSample } from '../lib/tests';

// Display-only significance brackets for column-shape plots. Pairwise two-sample
// t-tests (Welch or Student) between groups sitting at integer x positions;
// brackets stack upward with stars or a p-value label. The stats are computed,
// the annotation is display-only (no test-selection engine — spec §12).

function pairsFor(mode: PlotOptions['significance'], k: number): [number, number][] {
  const pairs: [number, number][] = [];
  if (mode === 'adjacent') for (let i = 0; i < k - 1; i++) pairs.push([i, i + 1]);
  else if (mode === 'vsFirst') for (let i = 1; i < k; i++) pairs.push([0, i]);
  return pairs;
}

// Mutates the layout: appends bracket shapes + labels and fixes the y-range so
// the brackets are visible above the data. `baseline` pins the bottom of the
// range (0 for bar; undefined lets the data minimum set it).
export function applySignificance(
  layout: Partial<Layout>,
  groups: Group[],
  opts: PlotOptions,
  baseline?: number
): void {
  if (opts.significance === 'none' || groups.length < 2) return;
  const all = groups.flatMap((g) => g.values.filter((v) => Number.isFinite(v)));
  if (all.length === 0) return;
  const dataMin = Math.min(...all);
  const dataMax = Math.max(...all);
  const gap = (dataMax - dataMin || Math.abs(dataMax) || 1) * 0.08;

  const shapes: Partial<Shape>[] = [];
  const annotations: Partial<Annotations>[] = [];
  let level = 0;

  for (const [i, j] of pairsFor(opts.significance, groups.length)) {
    const res = tTestTwoSample(groups[i].values, groups[j].values, {
      equalVar: opts.sigTest === 'student',
    });
    if (!res) continue;
    const h = dataMax + gap * (level + 1);
    const tick = gap * 0.45;
    shapes.push({
      type: 'path',
      xref: 'x',
      yref: 'y',
      path: `M ${i},${h - tick} L ${i},${h} L ${j},${h} L ${j},${h - tick}`,
      line: { color: '#333333', width: 1.2 },
    });
    annotations.push({
      x: (i + j) / 2,
      y: h,
      xref: 'x',
      yref: 'y',
      yanchor: 'bottom',
      text: opts.sigLabel === 'p' ? pLabel(res.p) : pStars(res.p),
      showarrow: false,
      font: { family: 'Arial, Helvetica, sans-serif', size: opts.sigLabel === 'p' ? 12 : 16, color: '#333333' },
    });
    level++;
  }
  if (shapes.length === 0) return;

  layout.shapes = [...(layout.shapes ?? []), ...shapes];
  layout.annotations = [...(layout.annotations ?? []), ...annotations];
  const top = dataMax + gap * (level + 1.6);
  const bottom = baseline !== undefined ? baseline : dataMin - gap;
  layout.yaxis = { ...layout.yaxis, range: [bottom, top], autorange: false };
}
