import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { survivalFromMapping } from '../data/mapping';
import { kaplanMeier as fitKM, survivalAt, survivalStepArrays } from '../lib/survival';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { hexA, hoverStyle } from './util';
import type { BuildResult } from './index';

// Kaplan–Meier survival (non-spec Prism type). One step curve per group, with an
// optional Greenwood 95% CI band and censoring tick marks. Each group shares a
// meta id so the hover highlight dims the other curves.
export function kaplanMeier(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const groups = survivalFromMapping(table, mapping);
  const traces: Data[] = [];

  groups.forEach((g, i) => {
    const color = paletteColor(opts.palette, i);
    const curve = fitKM(g.obs);
    const { x, y } = survivalStepArrays(curve);

    // CI band (drawn first, behind the step line). Built on the step grid so the
    // ribbon follows the staircase.
    if (opts.kmShowCI && curve.steps.length > 0) {
      const bx: number[] = [0];
      const up: number[] = [1];
      const lo: number[] = [1];
      for (const s of curve.steps) {
        bx.push(s.time);
        up.push(s.upper);
        lo.push(s.lower);
      }
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: [...bx, ...bx.slice().reverse()],
        y: [...up, ...lo.slice().reverse()],
        line: { width: 0, shape: 'hv' },
        fill: 'toself',
        fillcolor: hexA(color, 0.13),
        name: `${g.name} · 95% CI`,
        meta: g.name,
        showlegend: false,
        hoverinfo: 'skip',
      } as Data);
    }

    const medLabel = curve.median != null ? ` · median ${curve.median}` : '';
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x,
      y,
      name: `${g.name}${medLabel}`,
      line: { color, width: 2.5, shape: 'hv' },
      meta: g.name,
      hovertemplate: `<b>${g.name}</b><br>t = %{x}<br>S(t) = %{y:.3f}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    // Censoring ticks: markers on the curve at censoring times.
    if (opts.kmShowCensor && curve.censorTimes.length > 0) {
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: curve.censorTimes,
        y: curve.censorTimes.map((t) => survivalAt(curve, t)),
        name: `${g.name} · censored`,
        marker: { color, size: 8, symbol: 'line-ns-open', line: { width: 1.5 } },
        meta: g.name,
        showlegend: false,
        hovertemplate: `censored · t = %{x}<extra></extra>`,
        hoverlabel: hoverStyle,
      } as Data);
    }
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle || 'Time',
    yTitle: opts.yTitle || 'Survival probability',
  });
  layout.showlegend = true;
  layout.yaxis = { ...layout.yaxis, range: [0, 1.02], tickformat: '.0%' };
  layout.xaxis = { ...layout.xaxis, rangemode: 'tozero' };
  return { traces, layout };
}
