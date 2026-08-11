import type { Data } from 'plotly.js';
import type { Column, Mapping, PlotOptions, Table } from '../data/types';
import { getColumn, numericColumns } from '../data/mapping';
import { baseLayout } from '../theme/plotlyTheme';
import { fmt, hoverStyle } from './util';
import type { BuildResult } from './index';

// Paired / before-after (§7). Two conditions; one connecting line per subject,
// coloured by direction (up/down). Lines share a meta id per direction so the
// hover highlight groups all "up" (or all "down") subjects together.
const UP = '#D55E00';
const DOWN = '#0072B2';
const FLAT = '#5C6675';

export function paired(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const names = mapping.value ?? numericColumns(table).map((c) => c.name);
  const cols = names
    .map((n) => getColumn(table, n))
    .filter((c): c is Column => !!c && c.type === 'numeric')
    .slice(0, 2);

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle || 'Value',
  });

  if (cols.length < 2) {
    layout.showlegend = false;
    return { traces: [], layout };
  }

  const [before, after] = cols;
  const traces: Data[] = [];
  for (let r = 0; r < table.nRows; r++) {
    const b = Number(before.values[r]);
    const a = Number(after.values[r]);
    if (!Number.isFinite(b) || !Number.isFinite(a)) continue;
    const dir = a >= b ? 'up' : 'down';
    const color = opts.pairedColorByDirection ? (dir === 'up' ? UP : DOWN) : FLAT;
    traces.push({
      type: 'scatter',
      mode: 'lines+markers',
      x: [0, 1],
      y: [b, a],
      name: dir,
      meta: dir,
      line: { color, width: 1.5 },
      marker: { color, size: 7, line: { color: '#FFFFFF', width: 1 } },
      showlegend: false,
      hovertemplate: `${before.name}: ${fmt(b)}<br>${after.name}: ${fmt(a)}<br>Δ = ${fmt(a - b)}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);
  }

  layout.showlegend = false;
  layout.xaxis = {
    ...layout.xaxis,
    tickmode: 'array',
    tickvals: [0, 1],
    ticktext: [before.name, after.name],
    range: [-0.3, 1.3],
  };
  return { traces, layout };
}
