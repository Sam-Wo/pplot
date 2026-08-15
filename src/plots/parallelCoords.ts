import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { featureMatrixFromMapping } from '../data/mapping';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import type { BuildResult } from './index';

// Parallel coordinates (high-dimensionality). One vertical axis per feature;
// each observation is a polyline. Native Plotly brushing lets the user drag on
// any axis to filter. Lines are coloured by an optional group column via a
// discrete colorscale so each group keeps its palette colour.
export function parallelCoords(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const fm = featureMatrixFromMapping(table, mapping);
  const dims = fm.featureNames.map((name, j) => ({
    label: name,
    values: fm.rows.map((row) => (typeof row[j] === 'number' ? (row[j] as number) : null)),
  }));

  const uniqueGroups = [...new Set(fm.groups.filter((g) => g !== ''))];
  const hasGroups = uniqueGroups.length > 0;

  let line: Record<string, unknown> = { color: paletteColor(opts.palette, 0) };
  if (hasGroups) {
    const idxOf = new Map(uniqueGroups.map((g, i) => [g, i]));
    const k = uniqueGroups.length;
    // Stepwise colorscale → discrete band per group.
    const colorscale: [number, string][] = [];
    uniqueGroups.forEach((_, i) => {
      colorscale.push([i / k, paletteColor(opts.palette, i)]);
      colorscale.push([(i + 1) / k, paletteColor(opts.palette, i)]);
    });
    line = {
      color: fm.groups.map((g) => (idxOf.get(g) ?? 0) + 0.5),
      colorscale,
      cmin: 0,
      cmax: k,
      showscale: false,
    };
  }

  const trace = {
    type: 'parcoords',
    dimensions: dims,
    line,
    labelfont: { family: 'Arial, Helvetica, sans-serif', size: 13 },
    tickfont: { family: 'Arial, Helvetica, sans-serif', size: 11 },
    rangefont: { family: 'Arial, Helvetica, sans-serif', size: 10 },
  } as unknown as Data;

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: '',
    yTitle: '',
  });
  // Parcoords has no cartesian axes.
  delete layout.xaxis;
  delete layout.yaxis;
  layout.margin = { ...layout.margin, l: 60, r: 40, t: opts.title ? 70 : 50, b: 30 };
  return { traces: [trace], layout };
}
