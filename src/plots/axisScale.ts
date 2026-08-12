import type { LayoutAxis } from 'plotly.js';
import type { AxisScale } from '../data/types';

// Axis scale switch. Log₁₀ is Plotly's native log axis. Plotly has no base-2
// axis, but a log axis IS a log axis — only the tick positions/labels differ, so
// Log₂ is a native log axis relabelled with power-of-2 ticks.
export function axisScaleProps(scale: AxisScale, values: number[]): Partial<LayoutAxis> {
  if (scale === 'linear') return { type: 'linear' };
  if (scale === 'log10') return { type: 'log' };

  const pos = values.filter((v) => v > 0 && Number.isFinite(v));
  if (pos.length === 0) return { type: 'log' };
  let lo = Math.floor(Math.log2(Math.min(...pos)));
  const hi = Math.ceil(Math.log2(Math.max(...pos)));
  // Thin ticks if the range is very wide.
  const step = hi - lo > 12 ? 2 : 1;
  const tickvals: number[] = [];
  for (let e = lo; e <= hi; e += step) tickvals.push(2 ** e);
  const fmtTick = (v: number) => (v >= 1 ? String(v) : String(Number(v.toPrecision(3))));
  return { type: 'log', tickvals, ticktext: tickvals.map(fmtTick) };
}

// A shape coordinate on an axis: Plotly wants log10(value) on a log axis, the
// raw value on a linear one.
export function shapeCoord(scale: AxisScale, value: number): number {
  return scale === 'linear' ? value : Math.log10(value);
}
