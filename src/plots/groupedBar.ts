import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { twoWayFromMapping } from '../data/mapping';
import { summarize } from '../lib/stats';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { errValue, errorLabel, hoverStyle, shade } from './util';
import type { BuildResult } from './index';

// Grouped / clustered bar (§7). Two-way tidy data: category (x) × group × value.
// Each group is its own trace across categories, grouped or stacked.
export function groupedBar(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { categories, groups } = twoWayFromMapping(table, mapping);
  const centerLabel = opts.center === 'median' ? 'median' : 'mean';

  const traces: Data[] = groups.map((g, i) => {
    const color = paletteColor(opts.palette, i);
    const summaries = g.byCategory.map((vals) => summarize(vals));
    const y = summaries.map((s) => (opts.center === 'median' ? s.median : s.mean));
    const err = summaries.map((s) => errValue(opts.error, s) ?? 0);
    const ns = summaries.map((s) => s.n);
    return {
      type: 'bar',
      x: categories,
      y,
      name: g.name,
      marker: { color, line: { color: shade(color), width: 1 } },
      ...(opts.error !== 'none'
        ? {
            error_y: {
              type: 'data',
              array: err,
              visible: true,
              color: '#333333',
              thickness: 1.5,
              width: 5,
            },
          }
        : {}),
      meta: g.name,
      customdata: ns.map((n, k) => [err[k], n]),
      hovertemplate:
        `<b>${g.name}</b> · %{x}<br>${centerLabel}: %{y:.3~g}` +
        (opts.error !== 'none' ? `<br>± ${errorLabel[opts.error]}: %{customdata[0]:.3~g}` : '') +
        `<br>n = %{customdata[1]}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data;
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle || 'Value',
  });
  layout.barmode = opts.barStacked ? 'stack' : 'group';
  layout.bargap = 0.28;
  layout.bargroupgap = 0.08;
  layout.showlegend = true;
  return { traces, layout };
}
