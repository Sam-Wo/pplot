import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { matrixFromMapping } from '../data/mapping';
import { zscore } from '../lib/stats';
import { divergingScales, sequentialScales } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// Heatmap (§7). Optional per-row z-score (diverging scale, zmid 0); otherwise a
// sequential scale. A single trace — hover-highlight here is the crosshair
// (hover.ts), not trace dimming. Hover always surfaces the raw value.
export function heatmap(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { rowLabels, colLabels, z } = matrixFromMapping(table, mapping);

  const raw = z.map((row) => row.map((v) => (v === null ? NaN : v)));
  const display = opts.zscoreRows ? raw.map((row) => zscore(row)) : raw;
  const toCell = (v: number) => (Number.isFinite(v) ? v : null);

  const hovertemplate = opts.zscoreRows
    ? '<b>%{y}</b><br>%{x}<br>value: %{customdata:.3~g}<br>z-score: %{z:.2f}<extra></extra>'
    : '<b>%{y}</b><br>%{x}<br>value: %{z:.3~g}<extra></extra>';

  const trace: Data = {
    type: 'heatmap',
    x: colLabels,
    y: rowLabels,
    z: display.map((row) => row.map(toCell)),
    customdata: raw.map((row) => row.map(toCell)),
    colorscale: opts.zscoreRows
      ? divergingScales[opts.divergingScale]
      : sequentialScales[opts.sequentialScale],
    ...(opts.zscoreRows ? { zmid: 0 } : {}),
    xgap: 1,
    ygap: 1,
    colorbar: {
      title: { text: opts.zscoreRows ? 'z-score' : 'value', side: 'right', font: { size: 13 } },
      thickness: 14,
      len: 0.92,
      outlinewidth: 0,
      tickfont: { size: 12 },
    },
    hovertemplate,
    hoverlabel: hoverStyle,
  } as Data;

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle,
  });
  // Rows read top-to-bottom; no gridlines behind the cells.
  layout.yaxis = { ...layout.yaxis, autorange: 'reversed', showgrid: false, showline: false, ticks: '' };
  layout.xaxis = { ...layout.xaxis, showgrid: false, showline: false, ticks: '' };
  layout.margin = { ...layout.margin, l: 96 };

  return { traces: [trace], layout };
}
