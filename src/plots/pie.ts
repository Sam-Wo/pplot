import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { partsFromMapping } from '../data/mapping';
import { palettes } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// Pie / parts-of-whole (non-spec Prism type). A label column + one value column,
// summed by label. Donut by default; slices coloured from the active palette.
// Each slice is a segment of a single trace, so highlight uses Plotly's native
// slice pull on hover rather than the trace-dim treatment.
export function pie(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { labels, values } = partsFromMapping(table, mapping);
  const colors = labels.map((_, i) => palettes[opts.palette][i % palettes[opts.palette].length]);

  const trace: Data = {
    type: 'pie',
    labels,
    values,
    hole: opts.pieDonut ? 0.5 : 0,
    marker: { colors, line: { color: '#FFFFFF', width: 2 } },
    sort: false,
    direction: 'clockwise',
    textinfo: opts.pieShowValues ? 'label+percent' : 'label',
    textposition: 'auto',
    texttemplate: opts.pieShowValues ? '%{label}<br>%{percent}' : '%{label}',
    hovertemplate: '<b>%{label}</b><br>value: %{value}<br>%{percent}<extra></extra>',
    hoverlabel: hoverStyle,
    // Lift the hovered slice out slightly — the signature emphasis, pie-style.
    pull: 0,
  } as Data;

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: '',
    yTitle: '',
  });
  // Pie has no cartesian axes.
  delete layout.xaxis;
  delete layout.yaxis;
  layout.showlegend = true;
  return { traces: [trace], layout };
}
