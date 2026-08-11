import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { groupsFromValue } from '../data/mapping';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hexA, hoverStyle, shade } from './util';
import { applySignificance } from './significance';
import type { BuildResult } from './index';

// Box plot (§7). Column shape: each value column is a distribution, its own
// trace so series-dim highlight works. Plotly's native box hover surfaces the
// five-number summary (min · Q1 · median · Q3 · max).
export function box(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const groups = groupsFromValue(table, mapping);
  const traces: Data[] = groups.map((g, i) => {
    const color = paletteColor(opts.palette, i);
    return {
      type: 'box',
      y: g.values,
      name: g.name,
      boxpoints: opts.showPoints ? 'all' : false,
      jitter: 0.4,
      pointpos: 0,
      notched: opts.boxNotched,
      whiskerwidth: 0.6,
      marker: { color, size: 6, opacity: 0.7, line: { color: '#FFFFFF', width: 1 } },
      line: { color: shade(color, -0.25), width: 1.5 },
      fillcolor: hexA(color, 0.35),
      meta: g.name,
      hoverlabel: hoverStyle,
    } as Data;
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle || 'Value',
  });
  layout.showlegend = false;
  applySignificance(layout, groups, opts);
  return { traces, layout };
}
