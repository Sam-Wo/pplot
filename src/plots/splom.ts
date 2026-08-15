import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { featureMatrixFromMapping } from '../data/mapping';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// Scatter-plot matrix / SPLOM (high-dimensionality). Pairwise scatter grid
// across the selected numeric features. One trace per group so the legend and
// the series-dim hover highlight work; the diagonal is hidden.
export function splom(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const fm = featureMatrixFromMapping(table, mapping);
  const dimsOf = (idx: number[]) =>
    fm.featureNames.map((name, j) => ({
      label: name,
      values: idx.map((i) => fm.rows[i][j]),
    }));

  const uniqueGroups = [...new Set(fm.groups.map((g) => g || 'All'))];
  const rowGroups = fm.groups.map((g) => g || 'All');

  const traces: Data[] = uniqueGroups.map((g, gi) => {
    const idx = rowGroups.map((gg, i) => (gg === g ? i : -1)).filter((i) => i >= 0);
    return {
      type: 'splom',
      name: g,
      dimensions: dimsOf(idx),
      marker: { color: paletteColor(opts.palette, gi), size: 5, opacity: 0.7, line: { color: '#FFFFFF', width: 0.3 } },
      diagonal: { visible: false },
      showupperhalf: false,
      meta: g,
      hoverlabel: hoverStyle,
    } as unknown as Data;
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: '',
    yTitle: '',
  });
  delete layout.xaxis;
  delete layout.yaxis;
  layout.showlegend = uniqueGroups.length > 1;
  layout.dragmode = 'select';
  // Light styling shared by every generated subplot axis.
  const axis = { showline: true, linecolor: '#333333', gridcolor: '#ECECEC', zeroline: false, tickfont: { size: 10 } };
  const n = fm.featureNames.length;
  for (let i = 1; i <= n; i++) {
    (layout as Record<string, unknown>)[`xaxis${i === 1 ? '' : i}`] = axis;
    (layout as Record<string, unknown>)[`yaxis${i === 1 ? '' : i}`] = axis;
  }
  return { traces, layout };
}
