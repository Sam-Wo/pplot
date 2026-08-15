import Plotly from 'plotly.js-dist-min';
import type { PlotType } from '../../data/types';

// Highlight-on-hover (§8). Attached after each Plotly.react; returns a detach
// function so listeners are cleaned up before the next draw and on unmount.

/* eslint-disable @typescript-eslint/no-explicit-any */

const BAND = 'rgba(14,124,116,0.14)';

// Series/group emphasis. Each group (and its overlaid points, and its crossbar)
// share a `meta` id, so emphasizing the hovered group's meta dims everything
// else — this is the bar↔points link for free (§8).
function attachSeriesHighlight(gd: any): () => void {
  const onHover = (e: any) => {
    const cn = e.points?.[0]?.curveNumber;
    if (cn == null) return;
    const group = gd.data[cn]?.meta;
    const op = gd.data.map((t: any) => (group == null || t.meta === group ? 1 : 0.18));
    void Plotly.restyle(gd, { opacity: op });
  };
  const onUnhover = () => {
    void Plotly.restyle(gd, { opacity: gd.data.map(() => 1) });
  };
  gd.on('plotly_hover', onHover);
  gd.on('plotly_unhover', onUnhover);
  return () => {
    gd.removeListener?.('plotly_hover', onHover);
    gd.removeListener?.('plotly_unhover', onUnhover);
  };
}

// Heatmap crosshair: band the hovered row and column (Appendix A). Categorical
// axes map a category to its index, so ±0.5 around the index covers the cell.
function attachHeatmapCrosshair(gd: any): () => void {
  const onHover = (e: any) => {
    const p = e.points?.[0];
    if (!p) return;
    const xcats: unknown[] = gd.data[0]?.x ?? [];
    const ycats: unknown[] = gd.data[0]?.y ?? [];
    const col = xcats.indexOf(p.x);
    const row = ycats.indexOf(p.y);
    if (col < 0 || row < 0) return;
    void Plotly.relayout(gd, {
      shapes: [
        { type: 'rect', xref: 'x', yref: 'paper', x0: col - 0.5, x1: col + 0.5, y0: 0, y1: 1, line: { width: 0 }, fillcolor: BAND, layer: 'above' },
        { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: row - 0.5, y1: row + 0.5, line: { width: 0 }, fillcolor: BAND, layer: 'above' },
      ],
    });
  };
  const onUnhover = () => void Plotly.relayout(gd, { shapes: [] });
  gd.on('plotly_hover', onHover);
  gd.on('plotly_unhover', onUnhover);
  return () => {
    gd.removeListener?.('plotly_hover', onHover);
    gd.removeListener?.('plotly_unhover', onUnhover);
  };
}

// Volcano click-to-label (§8 stretch): click a point to pin/unpin its label.
function attachVolcano(gd: any): () => void {
  const detachHighlight = attachSeriesHighlight(gd);
  const onClick = (e: any) => {
    const p = e.points?.[0];
    if (!p || p.customdata == null) return;
    const text = String(p.customdata);
    const anns = (gd.layout.annotations ?? []).slice();
    const idx = anns.findIndex(
      (a: any) => a.text === text && Math.abs(a.x - p.x) < 1e-9 && Math.abs(a.y - p.y) < 1e-9
    );
    if (idx >= 0) anns.splice(idx, 1);
    else
      anns.push({
        x: p.x,
        y: p.y,
        text,
        xref: 'x',
        yref: 'y',
        showarrow: true,
        arrowhead: 0,
        arrowcolor: '#5C6675',
        ax: 0,
        ay: -18,
        font: { family: 'Arial, Helvetica, sans-serif', size: 11, color: '#141A22' },
      });
    void Plotly.relayout(gd, { annotations: anns });
  };
  gd.on('plotly_click', onClick);
  return () => {
    detachHighlight();
    gd.removeListener?.('plotly_click', onClick);
  };
}

export function attachHover(gd: HTMLDivElement, plotType: PlotType): () => void {
  if (plotType === 'heatmap' || plotType === 'correlation') return attachHeatmapCrosshair(gd);
  if (plotType === 'volcano') return attachVolcano(gd);
  // parcoords/splom have their own native brushing; series-dim is a no-op there.
  return attachSeriesHighlight(gd);
}
