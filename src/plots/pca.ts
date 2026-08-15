import type { Annotations, Data, Shape } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { featureMatrixFromMapping } from '../data/mapping';
import { pca as runPCA } from '../lib/pca';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// PCA scatter (high-dimensionality). Rows are observations, selected numeric
// columns are features; observations are projected onto PC1/PC2 and coloured by
// an optional group column. An optional biplot overlays scaled loading vectors.
export function pca(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const fm = featureMatrixFromMapping(table, mapping);
  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: '',
    yTitle: '',
  });

  const result = runPCA(fm.rows, fm.featureNames, {
    standardize: opts.pcaStandardize,
    components: 2,
  });
  if (!result || result.explained.length < 2) {
    layout.xaxis = { ...layout.xaxis, title: { text: 'PC1' } };
    layout.yaxis = { ...layout.yaxis, title: { text: 'PC2' } };
    return { traces: [], layout };
  }

  const pc1 = (result.explained[0] * 100).toFixed(1);
  const pc2 = (result.explained[1] * 100).toFixed(1);

  // Points, split into one trace per group so the hover highlight works.
  const groupsFor = result.keptRows.map((r) => fm.groups[r] || 'All');
  const labelsFor = result.keptRows.map((r) => fm.labels[r]);
  const uniqueGroups = [...new Set(groupsFor)];
  const traces: Data[] = uniqueGroups.map((g, gi) => {
    const idx = groupsFor.map((gg, i) => (gg === g ? i : -1)).filter((i) => i >= 0);
    return {
      type: 'scatter',
      mode: 'markers',
      x: idx.map((i) => result.scores[i][0]),
      y: idx.map((i) => result.scores[i][1]),
      name: g,
      marker: { color: paletteColor(opts.palette, gi), size: 9, opacity: 0.85, line: { color: '#FFFFFF', width: 1 } },
      customdata: idx.map((i) => labelsFor[i]),
      meta: g,
      hovertemplate: `<b>%{customdata}</b><br>${g}<br>PC1: %{x:.2f}<br>PC2: %{y:.2f}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data;
  });

  // Optional biplot: loading vectors scaled to the score cloud.
  if (opts.pcaBiplot) {
    const maxScore = Math.max(
      ...result.scores.map((s) => Math.hypot(s[0], s[1])),
      1e-9
    );
    const maxLoad = Math.max(...result.loadings.map((l) => Math.hypot(l[0], l[1])), 1e-9);
    const scale = (maxScore / maxLoad) * 0.8;
    const shapes: Partial<Shape>[] = [];
    const annotations: Partial<Annotations>[] = [];
    result.loadings.forEach((l, i) => {
      const x = l[0] * scale;
      const y = l[1] * scale;
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'y',
        x0: 0,
        y0: 0,
        x1: x,
        y1: y,
        line: { color: '#5C6675', width: 1.2 },
      });
      annotations.push({
        x,
        y,
        xref: 'x',
        yref: 'y',
        text: result.featureNames[i],
        showarrow: false,
        font: { family: 'Arial, Helvetica, sans-serif', size: 11, color: '#141A22' },
      });
    });
    layout.shapes = shapes;
    layout.annotations = annotations;
  }

  layout.showlegend = uniqueGroups.length > 1;
  layout.xaxis = { ...layout.xaxis, title: { text: `PC1 · ${pc1}%` }, zeroline: true, zerolinecolor: '#E2E7ED' };
  layout.yaxis = { ...layout.yaxis, title: { text: `PC2 · ${pc2}%` }, zeroline: true, zerolinecolor: '#E2E7ED' };
  return { traces, layout };
}
