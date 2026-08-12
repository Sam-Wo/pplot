import type { Data, Shape } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { xyFromMapping } from '../data/mapping';
import { fit4PL, fourPLDose } from '../lib/doseResponse';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { axisScaleProps, shapeCoord } from './axisScale';
import { fmt, hexA, hoverStyle } from './util';
import type { BuildResult } from './index';

// Dose–response with IC50 (§7 extension). Each series is fit to a 4PL/3PL Hill
// curve in log-dose space; the sigmoid is overlaid and the IC50 reported in the
// legend and marked on the curve. Handles binding (increasing) and killing
// (decreasing) curves alike.
export function doseResponse(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { xName, series } = xyFromMapping(table, mapping);
  const traces: Data[] = [];
  const shapes: Partial<Shape>[] = [];
  const allDoses: number[] = [];
  const allResp: number[] = [];

  series.forEach((s, i) => {
    const color = paletteColor(opts.palette, i);
    allDoses.push(...s.x);
    allResp.push(...s.y);

    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: s.x,
      y: s.y,
      name: s.name,
      marker: { color, size: 8, opacity: 0.85, line: { color: '#FFFFFF', width: 1 } },
      meta: s.name,
      showlegend: false,
      hovertemplate: `<b>${s.name}</b><br>${xName}: %{x:.3~g}<br>%{y:.3~g}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    const fit = fit4PL(s.x, s.y, { model: opts.drModel });
    if (!fit || !fit.ok) return;

    const pos = s.x.filter((d) => d > 0);
    const dmin = Math.min(...pos);
    const dmax = Math.max(...pos);
    const lo = Math.log10(dmin);
    const hi = Math.log10(dmax);
    const cx: number[] = [];
    const cy: number[] = [];
    for (let k = 0; k <= 80; k++) {
      const d = Math.pow(10, lo + ((hi - lo) * k) / 80);
      cx.push(d);
      cy.push(fourPLDose(d, fit.top, fit.bottom, fit.logIC50, fit.hill));
    }
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: cx,
      y: cy,
      name: `${s.name} · IC50 ${fmt(fit.ic50)}`,
      line: { color, width: 2.5 },
      meta: s.name,
      showlegend: true,
      hovertemplate:
        `<b>${s.name}</b><br>IC50 = ${fmt(fit.ic50)}<br>Hill = ${fmt(fit.hill)}<br>R² = ${fit.r2.toFixed(3)}<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    if (opts.drShowIC50 && fit.ic50 >= dmin && fit.ic50 <= dmax) {
      const mid = (fit.top + fit.bottom) / 2;
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: [fit.ic50],
        y: [mid],
        name: `${s.name} IC50`,
        marker: { color, size: 10, symbol: 'x', line: { color: '#FFFFFF', width: 1 } },
        meta: s.name,
        showlegend: false,
        hovertemplate: `IC50 = ${fmt(fit.ic50)}<extra></extra>`,
        hoverlabel: hoverStyle,
      } as Data);
      const xc = shapeCoord(opts.xScale, fit.ic50);
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: xc,
        x1: xc,
        y0: 0,
        y1: 1,
        line: { color: hexA(color, 0.5), width: 1, dash: 'dot' },
      });
    }
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle || xName || 'Concentration',
    yTitle: opts.yTitle || 'Response',
  });
  layout.showlegend = true;
  layout.hovermode = opts.hoverUnified ? 'x unified' : 'closest';
  if (shapes.length) layout.shapes = shapes;
  layout.xaxis = { ...layout.xaxis, ...axisScaleProps(opts.xScale, allDoses) };
  layout.yaxis = { ...layout.yaxis, ...axisScaleProps(opts.yScale, allResp) };
  return { traces, layout };
}
