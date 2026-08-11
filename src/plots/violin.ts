import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { groupsFromValue } from '../data/mapping';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hexA, hoverStyle, shade } from './util';
import type { BuildResult } from './index';

// Violin (§7). Column shape, one trace per value column. Optional inner box,
// optional points, and a half-violin mode (side = positive).
export function violin(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const half = opts.violinSide === 'half';
  const groups = groupsFromValue(table, mapping);
  const traces: Data[] = groups.map((g, i) => {
    const color = paletteColor(opts.palette, i);
    return {
      type: 'violin',
      y: g.values,
      name: g.name,
      side: half ? 'positive' : 'both',
      box: { visible: opts.violinShowBox, width: 0.2 },
      meanline: { visible: true },
      points: opts.showPoints ? 'all' : false,
      jitter: 0.35,
      pointpos: half ? -0.25 : 0,
      scalemode: 'width',
      marker: { color, size: 6, opacity: 0.6, line: { color: '#FFFFFF', width: 1 } },
      line: { color: shade(color, -0.2), width: 1.5 },
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
  return { traces, layout };
}
