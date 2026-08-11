import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { groupsFromValue } from '../data/mapping';
import { summarize } from '../lib/stats';
import { jitter } from '../lib/jitter';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { errValue, errorLabel, fmt, hoverStyle, shade } from './util';
import { applySignificance } from './significance';
import type { BuildResult } from './index';

// Bar (mean) + points + error (§7). Each group is its own trace so the
// hover-highlight and bar↔points link are one-line restyles (§8). Groups sit at
// integer x positions with array ticks, which lets points jitter cleanly.
export function bar(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const groups = groupsFromValue(table, mapping);
  const traces: Data[] = [];
  const tickvals: number[] = [];
  const ticktext: string[] = [];

  groups.forEach((g, i) => {
    const color = paletteColor(opts.palette, i);
    const s = summarize(g.values);
    const center = opts.center === 'median' ? s.median : s.mean;
    const err = errValue(opts.error, s);
    tickvals.push(i);
    ticktext.push(g.name);

    const errLine =
      err !== undefined
        ? `<br>± ${errorLabel[opts.error]}: ${fmt(err)}`
        : '';
    traces.push({
      type: 'bar',
      x: [i],
      y: [center],
      name: g.name,
      width: 0.62,
      marker: { color, line: { color: shade(color), width: 1 } },
      ...(err !== undefined
        ? {
            error_y: {
              type: 'data',
              array: [err],
              visible: true,
              color: '#333333',
              thickness: 1.5,
              width: 8,
            },
          }
        : {}),
      meta: g.name,
      opacity: 1,
      showlegend: false,
      hovertemplate:
        `<b>${g.name}</b><br>` +
        `${opts.center === 'median' ? 'median' : 'mean'}: ${fmt(center)}` +
        `${errLine}<br>n = ${s.n}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    if (opts.showPoints) {
      const px = g.values.map((_, j) => i + jitter(j, opts.jitterWidth, i));
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: px,
        y: g.values,
        name: g.name,
        marker: { color, size: 7, opacity: 0.9, line: { color: '#FFFFFF', width: 1 } },
        meta: g.name,
        showlegend: false,
        customdata: g.values.map((_, j) => j + 1),
        hovertemplate:
          `<b>${g.name}</b><br>value: %{y:.3~g}<br>replicate %{customdata}<extra></extra>`,
        hoverlabel: hoverStyle,
      } as Data);
    }
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle || 'Value',
  });
  layout.barmode = 'overlay';
  layout.showlegend = false;
  layout.xaxis = {
    ...layout.xaxis,
    tickmode: 'array',
    tickvals,
    ticktext,
    range: [-0.6, Math.max(groups.length - 0.4, 0.6)],
  };
  applySignificance(layout, groups, opts, 0);

  return { traces, layout };
}
