import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { groupsFromValue } from '../data/mapping';
import { kde, sturgesBins } from '../lib/kde';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hexA, hoverStyle, shade } from './util';
import type { BuildResult } from './index';

const NORM: Record<PlotOptions['histNorm'], '' | 'probability' | 'probability density'> = {
  count: '',
  probability: 'probability',
  density: 'probability density',
};

// Histogram / density (§7). Column shape: each value column overlaid. Bins,
// normalization, and an optional KDE density overlay scaled to match the bars.
export function histogram(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const groups = groupsFromValue(table, mapping);
  const traces: Data[] = [];

  groups.forEach((g, i) => {
    const color = paletteColor(opts.palette, i);
    const finite = g.values.filter((v) => Number.isFinite(v));
    const nb = opts.histBins > 0 ? opts.histBins : sturgesBins(finite.length);

    traces.push({
      type: 'histogram',
      x: g.values,
      name: g.name,
      nbinsx: nb,
      histnorm: NORM[opts.histNorm],
      marker: { color: hexA(color, 0.55), line: { color: shade(color, -0.15), width: 1 } },
      meta: g.name,
      hovertemplate: `<b>${g.name}</b><br>bin: %{x}<br>%{y}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    if (opts.histDensity && finite.length > 1) {
      const min = Math.min(...finite);
      const max = Math.max(...finite);
      const binW = (max - min) / nb || 1;
      // KDE is a density; rescale to the histogram's y-units.
      const scale =
        opts.histNorm === 'count' ? finite.length * binW : opts.histNorm === 'probability' ? binW : 1;
      const pts = kde(finite);
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: pts.map((p) => p[0]),
        y: pts.map((p) => p[1] * scale),
        name: `${g.name} · density`,
        line: { color: shade(color, -0.15), width: 2 },
        meta: g.name,
        showlegend: false,
        hoverinfo: 'skip',
      } as Data);
    }
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle || 'Value',
    yTitle: opts.yTitle || (opts.histNorm === 'count' ? 'Count' : opts.histNorm),
  });
  layout.barmode = 'overlay';
  layout.showlegend = groups.length > 1;
  return { traces, layout };
}
