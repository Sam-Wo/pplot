import type { Annotations, Data, Shape } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { getColumn } from '../data/mapping';
import { baseLayout } from '../theme/plotlyTheme';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// Volcano (§7). log2 fold-change vs −log10 p, split into up / down / n.s. by the
// FC and p thresholds. Significant points are auto-labelled (capped); the
// crosshair click handler (hover.ts) lets the user pin extra labels.
const UP = '#D55E00';
const DOWN = '#0072B2';
const NS = '#AEB6BF';

interface Pt {
  x: number;
  y: number;
  label: string;
  cls: 'up' | 'down' | 'ns';
}

export function volcano(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const fcCol = getColumn(table, mapping.log2fc);
  const pCol = getColumn(table, mapping.pvalue);
  const labelCol = getColumn(table, mapping.label);

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle || 'log₂ fold-change',
    yTitle: opts.yTitle || '−log₁₀ p',
  });
  if (!fcCol || !pCol) return { traces: [], layout };

  const pts: Pt[] = [];
  for (let r = 0; r < table.nRows; r++) {
    const fc = Number(fcCol.values[r]);
    const p = Number(pCol.values[r]);
    if (!Number.isFinite(fc) || !Number.isFinite(p) || p <= 0) continue;
    const sig = p <= opts.pThreshold;
    const cls: Pt['cls'] =
      sig && fc >= opts.fcThreshold ? 'up' : sig && fc <= -opts.fcThreshold ? 'down' : 'ns';
    const label = labelCol && labelCol.values[r] != null ? String(labelCol.values[r]) : `#${r + 1}`;
    pts.push({ x: fc, y: -Math.log10(p), label, cls });
  }

  const groups: Record<Pt['cls'], Pt[]> = { down: [], ns: [], up: [] };
  for (const p of pts) groups[p.cls].push(p);
  const colorOf = { up: UP, down: DOWN, ns: NS };
  const nameOf = { up: 'Up', down: 'Down', ns: 'n.s.' };

  const traces: Data[] = (['ns', 'down', 'up'] as const).map(
    (cls) =>
      ({
        type: 'scatter',
        mode: 'markers',
        x: groups[cls].map((p) => p.x),
        y: groups[cls].map((p) => p.y),
        name: nameOf[cls],
        marker: {
          color: colorOf[cls],
          size: cls === 'ns' ? 6 : 8,
          opacity: cls === 'ns' ? 0.45 : 0.9,
          line: { color: '#FFFFFF', width: 0.5 },
        },
        customdata: groups[cls].map((p) => p.label),
        meta: nameOf[cls],
        hovertemplate: '<b>%{customdata}</b><br>log₂FC: %{x:.2f}<br>−log₁₀ p: %{y:.2f}<extra></extra>',
        hoverlabel: hoverStyle,
      }) as Data
  );

  const yThr = -Math.log10(opts.pThreshold);
  const dashed = { color: '#CDD5DE', width: 1, dash: 'dash' as const };
  const shapes: Partial<Shape>[] = [
    { type: 'line', xref: 'x', yref: 'paper', x0: opts.fcThreshold, x1: opts.fcThreshold, y0: 0, y1: 1, line: dashed },
    { type: 'line', xref: 'x', yref: 'paper', x0: -opts.fcThreshold, x1: -opts.fcThreshold, y0: 0, y1: 1, line: dashed },
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: yThr, y1: yThr, line: dashed },
  ];
  layout.shapes = shapes;

  if (opts.labelSignificant) {
    const sig = [...groups.up, ...groups.down].sort((a, b) => b.y - a.y).slice(0, 12);
    layout.annotations = sig.map(
      (p) =>
        ({
          x: p.x,
          y: p.y,
          text: p.label,
          xref: 'x',
          yref: 'y',
          showarrow: false,
          yshift: 9,
          font: { family: 'Arial, Helvetica, sans-serif', size: 11, color: '#141A22' },
        }) as Partial<Annotations>
    );
  }

  const maxAbs = Math.max(1, ...pts.map((p) => Math.abs(p.x)));
  layout.xaxis = { ...layout.xaxis, range: [-maxAbs * 1.1, maxAbs * 1.1], zeroline: true, zerolinecolor: '#E2E7ED' };
  layout.showlegend = true;
  return { traces, layout };
}
