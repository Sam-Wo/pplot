import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { groupsFromValue } from '../data/mapping';
import { summarize } from '../lib/stats';
import { jitter } from '../lib/jitter';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { errValue, errorLabel, fmt, hoverStyle } from './util';
import type { BuildResult } from './index';

// Dot / strip (jitter) + mean|median crossbar + error (§7). Points are the
// subject; a crossbar marks the centre and an optional whisker the spread.
export function dot(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const groups = groupsFromValue(table, mapping);
  const traces: Data[] = [];
  const tickvals: number[] = [];
  const ticktext: string[] = [];
  const half = 0.24;

  groups.forEach((g, i) => {
    const color = paletteColor(opts.palette, i);
    const s = summarize(g.values);
    const center = opts.center === 'median' ? s.median : s.mean;
    const err = errValue(opts.error, s);
    tickvals.push(i);
    ticktext.push(g.name);

    // Points.
    const px = g.values.map((_, j) => i + jitter(j, opts.jitterWidth, i));
    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: px,
      y: g.values,
      name: g.name,
      marker: { color, size: 8, opacity: 0.85, line: { color: '#FFFFFF', width: 1 } },
      meta: g.name,
      showlegend: false,
      customdata: g.values.map((_, j) => j + 1),
      hovertemplate: `<b>${g.name}</b><br>value: %{y:.3~g}<br>replicate %{customdata}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    // Optional error whisker (invisible anchor marker carrying error_y).
    if (err !== undefined) {
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: [i],
        y: [center],
        name: g.name,
        marker: { color, size: 1, opacity: 0 },
        error_y: { type: 'data', array: [err], visible: true, color: '#333333', thickness: 1.5, width: 10 },
        meta: g.name,
        showlegend: false,
        hoverinfo: 'skip',
      } as Data);
    }

    // Centre crossbar.
    const centerLabel = opts.center === 'median' ? 'median' : 'mean';
    const errLine = err !== undefined ? `<br>± ${errorLabel[opts.error]}: ${fmt(err)}` : '';
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: [i - half, i + half],
      y: [center, center],
      name: g.name,
      line: { color: '#333333', width: 3 },
      meta: g.name,
      showlegend: false,
      hovertemplate: `<b>${g.name}</b><br>${centerLabel}: ${fmt(center)}${errLine}<br>n = ${s.n}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle || 'Value',
  });
  layout.showlegend = false;
  layout.xaxis = {
    ...layout.xaxis,
    tickmode: 'array',
    tickvals,
    ticktext,
    range: [-0.6, Math.max(groups.length - 0.4, 0.6)],
  };

  return { traces, layout };
}
