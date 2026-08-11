import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { groupsFromValue } from '../data/mapping';
import { jitter } from '../lib/jitter';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hexA, hoverStyle, shade } from './util';
import type { BuildResult } from './index';

// Raincloud (§7), Goedhart-style: half-violin "cloud" to the right, a thin box,
// and the raw "rain" of jittered points to the left. Each group sits at an
// integer x position; the three parts share a meta id for the hover highlight.
export function raincloud(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const groups = groupsFromValue(table, mapping);
  const traces: Data[] = [];
  const tickvals: number[] = [];
  const ticktext: string[] = [];

  groups.forEach((g, i) => {
    const color = paletteColor(opts.palette, i);
    tickvals.push(i);
    ticktext.push(g.name);
    const at = g.values.map(() => i);

    // Cloud: half violin to the positive (right) side.
    traces.push({
      type: 'violin',
      x: at,
      y: g.values,
      name: g.name,
      side: 'positive',
      width: 1.6,
      points: false,
      box: { visible: false },
      meanline: { visible: false },
      line: { color: shade(color, -0.2), width: 1.5 },
      fillcolor: hexA(color, 0.35),
      scalemode: 'width',
      meta: g.name,
      showlegend: false,
      hoverinfo: 'skip',
    } as Data);

    // Thin box centred on the position.
    traces.push({
      type: 'box',
      x: at,
      y: g.values,
      name: g.name,
      width: 0.12,
      boxpoints: false,
      whiskerwidth: 0.4,
      line: { color: shade(color, -0.3), width: 1.2 },
      fillcolor: 'rgba(255,255,255,0.65)',
      meta: g.name,
      showlegend: false,
      hoverlabel: hoverStyle,
    } as Data);

    // Rain: jittered points to the left.
    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: g.values.map((_, j) => i - 0.2 + jitter(j, 0.12, i)),
      y: g.values,
      name: g.name,
      marker: { color, size: 6, opacity: 0.7, line: { color: '#FFFFFF', width: 0.5 } },
      meta: g.name,
      showlegend: false,
      customdata: g.values.map((_, j) => j + 1),
      hovertemplate: `<b>${g.name}</b><br>value: %{y:.3~g}<br>replicate %{customdata}<extra></extra>`,
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
    range: [-0.7, Math.max(groups.length - 0.1, 0.9)],
  };
  return { traces, layout };
}
