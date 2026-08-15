import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { twoWayFromMapping } from '../data/mapping';
import { summarize } from '../lib/stats';
import { jitter } from '../lib/jitter';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { errValue, errorLabel, hoverStyle } from './util';
import type { BuildResult } from './index';

// Grouped scatter (non-spec Prism "Grouped" scatter). Two-way data: categories
// on x, subgroups offset side-by-side within each category, all points shown
// with a mean|median crossbar (± error). Each subgroup is its own trace so the
// hover highlight dims the others.
export function groupedScatter(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { categories, groups } = twoWayFromMapping(table, mapping);
  const traces: Data[] = [];
  const nG = groups.length || 1;
  const slotW = 0.7; // total width used within a category
  const bandW = slotW / nG;
  // Offset each subgroup's centre within the category slot.
  const offsetFor = (gi: number) => -slotW / 2 + bandW * (gi + 0.5);

  groups.forEach((g, gi) => {
    const color = paletteColor(opts.palette, gi);
    const offset = offsetFor(gi);
    const px: number[] = [];
    const py: number[] = [];
    categories.forEach((_, ci) => {
      const vals = g.byCategory[ci];
      vals.forEach((v, j) => {
        px.push(ci + offset + jitter(j, bandW * 0.7, gi * 31 + ci));
        py.push(v);
      });
    });

    // Points.
    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: px,
      y: py,
      name: g.name,
      marker: { color, size: 7, opacity: 0.8, line: { color: '#FFFFFF', width: 0.5 } },
      meta: g.name,
      legendgroup: g.name,
      hovertemplate: `<b>${g.name}</b><br>%{y:.3~g}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    // Crossbar (+ optional error) per category.
    const cbx: number[] = [];
    const cby: number[] = [];
    const errArr: number[] = [];
    categories.forEach((_, ci) => {
      const s = summarize(g.byCategory[ci]);
      if (s.n === 0) return;
      const center = opts.center === 'median' ? s.median : s.mean;
      const half = bandW * 0.4;
      // Two points + a break (null) draw a flat crossbar segment per category.
      cbx.push(ci + offset - half, ci + offset + half, NaN);
      cby.push(center, center, NaN);
      errArr.push(errValue(opts.error, s) ?? 0);
    });
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: cbx,
      y: cby,
      name: `${g.name} · mean`,
      line: { color: '#333333', width: 2 },
      meta: g.name,
      legendgroup: g.name,
      showlegend: false,
      hoverinfo: 'skip',
    } as Data);

    // Error whiskers as an invisible anchor carrying error_y, one per category.
    if (opts.error !== 'none') {
      const ex: number[] = [];
      const ey: number[] = [];
      categories.forEach((_, ci) => {
        const s = summarize(g.byCategory[ci]);
        if (s.n === 0) return;
        ex.push(ci + offset);
        ey.push(opts.center === 'median' ? s.median : s.mean);
      });
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: ex,
        y: ey,
        name: `${g.name} · ${errorLabel[opts.error]}`,
        marker: { color: color, size: 1, opacity: 0 },
        error_y: { type: 'data', array: errArr, visible: true, color: '#333333', thickness: 1.5, width: 6 },
        meta: g.name,
        legendgroup: g.name,
        showlegend: false,
        hoverinfo: 'skip',
      } as Data);
    }
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle || 'Value',
  });
  layout.showlegend = true;
  layout.xaxis = {
    ...layout.xaxis,
    tickmode: 'array',
    tickvals: categories.map((_, i) => i),
    ticktext: categories,
    range: [-0.6, Math.max(categories.length - 0.4, 0.6)],
  };
  return { traces, layout };
}
