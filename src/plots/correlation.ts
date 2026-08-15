import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { getColumn, numericColumns, numericValues } from '../data/mapping';
import { pearson, spearman } from '../lib/tests';
import { divergingScales } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// Correlation matrix (high-dimensionality). Pairwise Pearson or Spearman across
// all selected numeric columns, drawn as a diverging heatmap centred at 0.
// A single trace — hover surfaces the r for each cell; the heatmap crosshair
// applies (registered in hover.ts).
export function correlation(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const names = (mapping.value ?? numericColumns(table).map((c) => c.name)).filter((n) => {
    const c = getColumn(table, n);
    return c && c.type === 'numeric';
  });
  const cols = names.map((n) => numericValues(getColumn(table, n)!));
  const corr = opts.corrMethod === 'spearman' ? spearman : pearson;

  // z[i][j] = r(col_i, col_j). Diagonal is 1.
  const z: (number | null)[][] = names.map((_, i) =>
    names.map((__, j) => {
      if (i === j) return 1;
      const res = corr(cols[i], cols[j]);
      return res ? res.r : null;
    })
  );

  const trace: Data = {
    type: 'heatmap',
    x: names,
    y: names,
    z,
    colorscale: divergingScales[opts.divergingScale],
    zmid: 0,
    zmin: -1,
    zmax: 1,
    xgap: 1,
    ygap: 1,
    colorbar: { title: { text: 'r', side: 'right' }, thickness: 14, len: 0.9, outlinewidth: 0 },
    hovertemplate: '%{y} × %{x}<br>r = %{z:.2f}<extra></extra>',
    hoverlabel: hoverStyle,
    ...(opts.corrShowValues
      ? {
          text: z.map((row) => row.map((v) => (v == null ? '' : v.toFixed(2)))),
          texttemplate: '%{text}',
          textfont: { size: 11, family: 'Arial, Helvetica, sans-serif' },
        }
      : {}),
  } as Data;

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: '',
    yTitle: '',
  });
  layout.yaxis = { ...layout.yaxis, autorange: 'reversed', showgrid: false, showline: false, ticks: '' };
  layout.xaxis = { ...layout.xaxis, showgrid: false, showline: false, ticks: '' };
  layout.margin = { ...layout.margin, l: 110, b: 90 };
  return { traces: [trace], layout };
}
