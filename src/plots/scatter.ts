import type { Data } from 'plotly.js';
import type { Mapping, PlotOptions, Table } from '../data/types';
import { xyFromMapping } from '../data/mapping';
import { equationText, linearFit, loess } from '../lib/regression';
import { pearson, pLabel } from '../lib/tests';
import { paletteColor } from '../theme/palettes';
import { baseLayout } from '../theme/plotlyTheme';
import { axisScaleProps } from './axisScale';
import { hoverStyle } from './util';
import type { BuildResult } from './index';

// Scatter (§7). One X + one/more Y (or color-by-group). Optional linear or LOESS
// trendline; the linear fit reports its equation, R², and per-point residuals.
export function scatter(table: Table, mapping: Mapping, opts: PlotOptions): BuildResult {
  const { xName, series } = xyFromMapping(table, mapping);
  const traces: Data[] = [];

  series.forEach((s, i) => {
    const color = paletteColor(opts.palette, i);
    const fit = opts.trendline === 'linear' ? linearFit(s.x, s.y) : null;
    const residuals = fit ? s.y.map((y, k) => y - fit.predict(s.x[k])) : undefined;

    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: s.x,
      y: s.y,
      name: s.name,
      marker: { color, size: 8, opacity: 0.85, line: { color: '#FFFFFF', width: 1 } },
      meta: s.name,
      ...(residuals ? { customdata: residuals } : {}),
      hovertemplate:
        `<b>${s.name}</b><br>${xName}: %{x:.3~g}<br>%{y:.3~g}` +
        (residuals ? `<br>residual: %{customdata:.3~g}` : '') +
        `<extra></extra>`,
      hoverlabel: hoverStyle,
    } as Data);

    if (fit) {
      const xs = [Math.min(...s.x), Math.max(...s.x)];
      const corr = pearson(s.x, s.y);
      const pLine = corr ? `<br>r = ${corr.r.toFixed(3)} · ${pLabel(corr.p)}` : '';
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: xs,
        y: xs.map(fit.predict),
        name: `${s.name} · fit`,
        line: { color, width: 2 },
        meta: s.name,
        showlegend: false,
        hovertemplate: `${equationText(fit)}<br>R² = ${fit.r2.toFixed(3)}${pLine}<extra></extra>`,
        hoverlabel: hoverStyle,
      } as Data);
    } else if (opts.trendline === 'loess') {
      const pts = loess(s.x, s.y, opts.loessSpan);
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: pts.map((p) => p[0]),
        y: pts.map((p) => p[1]),
        name: `${s.name} · smooth`,
        line: { color, width: 2, shape: 'spline' },
        meta: s.name,
        showlegend: false,
        hovertemplate: `LOESS · ${s.name}<extra></extra>`,
        hoverlabel: hoverStyle,
      } as Data);
    }
  });

  const layout = baseLayout({
    transparent: opts.transparent,
    title: opts.title,
    xTitle: opts.xTitle || xName,
    yTitle: opts.yTitle,
  });
  layout.showlegend = series.length > 1;
  layout.hovermode = opts.hoverUnified ? 'x unified' : 'closest';
  const spike = { showspikes: true, spikemode: 'across' as const, spikethickness: 1, spikedash: 'dot', spikecolor: '#B0B7C0' };
  const xs = series.flatMap((s) => s.x);
  const ys = series.flatMap((s) => s.y);
  layout.xaxis = { ...layout.xaxis, ...spike, ...axisScaleProps(opts.xScale, xs) };
  layout.yaxis = { ...layout.yaxis, ...spike, ...axisScaleProps(opts.yScale, ys) };
  return { traces, layout };
}
