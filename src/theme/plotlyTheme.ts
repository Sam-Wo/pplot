import type { Layout, LayoutAxis, Config } from 'plotly.js';
import type { PlotOptions } from '../data/types';

// The figure theme (§10) — deliberately separate from UI chrome so figures stay
// portable and slide-safe. Refined by default: this is the look before the user
// changes anything.

const FIGURE_FONT = 'Arial, Helvetica, sans-serif';
const AXIS_COLOR = '#333333';
const GRID_COLOR = '#ECECEC';
const INK = '#141A22';

type ThemeInput = Pick<PlotOptions, 'transparent' | 'title' | 'xTitle' | 'yTitle'>;

function baseAxis(title: string | undefined, horizontalGrid: boolean): Partial<LayoutAxis> {
  return {
    title: title ? { text: title, font: { size: 16 } } : undefined,
    showgrid: horizontalGrid,
    gridcolor: GRID_COLOR,
    gridwidth: 1,
    zeroline: false,
    showline: true,
    linecolor: AXIS_COLOR,
    linewidth: 1.5,
    ticks: 'outside',
    tickcolor: AXIS_COLOR,
    ticklen: 6,
    tickfont: { size: 14 },
    automargin: true,
  };
}

// Larger base font than screen defaults because slide figures are read from a
// distance. No vertical gridlines; very light horizontal ones. Solid axis lines,
// outside ticks, no zero-line clutter. Left-aligned title.
export function baseLayout(opts: ThemeInput): Partial<Layout> {
  const bg = opts.transparent ? 'rgba(0,0,0,0)' : '#FFFFFF';
  return {
    font: { family: FIGURE_FONT, size: 16, color: INK },
    paper_bgcolor: bg,
    plot_bgcolor: bg,
    title: opts.title
      ? { text: opts.title, x: 0, xanchor: 'left', font: { size: 20, color: INK } }
      : undefined,
    margin: { l: 72, r: 24, t: opts.title ? 56 : 28, b: 60 },
    showlegend: true,
    legend: { bgcolor: 'rgba(0,0,0,0)', borderwidth: 0, font: { size: 14 } },
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: '#FFFFFF',
      bordercolor: '#CDD5DE',
      font: { family: FIGURE_FONT, size: 13, color: INK },
      align: 'left',
    },
    xaxis: baseAxis(opts.xTitle, false),
    yaxis: baseAxis(opts.yTitle, true),
  };
}

// Interaction/toolbar config. Kept lean and unbranded; export is handled by us.
export const baseConfig: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'toImage'],
  scrollZoom: false,
};
