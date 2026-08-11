import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { xyFromMapping } from '../data/mapping';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hexA, hoverStyle } from './util';
import type { BuildResult } from './index';

interface AggPoint {
  x: number;
  mean: number;
  sd: number;
}

// Collapse replicate y-values sharing an x into mean ± SD, sorted by x.
function aggregateByX(x: number[], y: number[]): AggPoint[] {
  const map = new Map<number, number[]>();
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) continue;
    if (!map.has(x[i])) map.set(x[i], []);
    map.get(x[i])!.push(y[i]);
  }
  return [...map.keys()]
    .sort((a, b) => a - b)
    .map((xv) => {
      const arr = map.get(xv)!;
      const n = arr.length;
      const mean = arr.reduce((a, b) => a + b, 0) / n;
      const sd = n > 1 ? Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
      return { x: xv, mean, sd };
    });
}

// Line / time-course (§7). Each series is a line through mean-per-x; when x
// values repeat (replicates), an optional ± SD ribbon is drawn. Unified hover
// is handy for reading all series at one x.
export function line(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { xName, series } = xyFromMapping(table, mapping);
  const traces: Data[] = [];

  series.forEach((s, i) => {
    const color = paletteColor(opts.palette, i);
    const agg = aggregateByX(s.x, s.y);
    const xs = agg.map((a) => a.x);
    const ys = agg.map((a) => a.mean);
    const hasSpread = opts.lineRibbon && agg.some((a) => a.sd > 0);

    if (hasSpread) {
      const upper = agg.map((a) => a.mean + a.sd);
      const lower = agg.map((a) => a.mean - a.sd);
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: [...xs, ...xs.slice().reverse()],
        y: [...upper, ...lower.slice().reverse()],
        fill: 'toself',
        fillcolor: hexA(color, 0.15),
        line: { width: 0 },
        name: `${s.name} · SD`,
        meta: s.name,
        showlegend: false,
        hoverinfo: 'skip',
      } as Data);
    }

    traces.push({
      type: 'scatter',
      mode: opts.lineMarkers ? 'lines+markers' : 'lines',
      x: xs,
      y: ys,
      name: s.name,
      line: { color, width: 2.5 },
      marker: { color, size: 7, line: { color: '#FFFFFF', width: 1 } },
      meta: s.name,
      hovertemplate: `<b>${s.name}</b><br>${xName}: %{x:.3~g}<br>%{y:.3~g}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle || xName,
    yTitle: opts.yTitle,
  });
  layout.showlegend = series.length > 1;
  layout.hovermode = opts.hoverUnified ? 'x unified' : 'closest';
  return { traces, layout };
}
