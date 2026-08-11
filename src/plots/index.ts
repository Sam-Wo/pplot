import type { Data, Layout } from 'plotly.js';
import type { Mapping, PlotOptions, PlotType, Table } from '../data/types';
import { bar } from './bar';
import { dot } from './dot';
import { heatmap } from './heatmap';
import { box } from './box';
import { violin } from './violin';
import { groupedBar } from './groupedBar';
import { scatter } from './scatter';
import { line } from './line';
import { volcano } from './volcano';
import { histogram } from './histogram';
import { raincloud } from './raincloud';
import { paired } from './paired';

// Core builder contract (§3): every plot is a pure
// (table, mapping, opts) => { traces, layout }.
export interface BuildResult {
  traces: Data[];
  layout: Partial<Layout>;
}
export type PlotBuilder = (table: Table, mapping: Mapping, opts: PlotOptions) => BuildResult;

// Implemented builders. Types not present here render a roadmap placeholder.
export const builders: Partial<Record<PlotType, PlotBuilder>> = {
  bar,
  dot,
  heatmap,
  box,
  violin,
  groupedBar,
  scatter,
  line,
  volcano,
  histogram,
  raincloud,
  paired,
};

export interface PlotInfo {
  label: string;
  shape: string;
  phase: 1 | 2 | 3;
}

// All plot types the spec targets, with the phase they land in. The picker
// lists them all; unimplemented ones are shown as upcoming.
export const plotMeta: Record<PlotType, PlotInfo> = {
  bar: { label: 'Bar + points', shape: 'Column', phase: 1 },
  dot: { label: 'Dot / strip', shape: 'Column', phase: 1 },
  heatmap: { label: 'Heatmap', shape: 'Matrix', phase: 1 },
  box: { label: 'Box plot', shape: 'Column', phase: 2 },
  violin: { label: 'Violin', shape: 'Column', phase: 2 },
  groupedBar: { label: 'Grouped bar', shape: 'Two-way', phase: 2 },
  scatter: { label: 'Scatter (XY)', shape: 'XY', phase: 2 },
  line: { label: 'Line / time-course', shape: 'XY', phase: 2 },
  raincloud: { label: 'Raincloud', shape: 'Column', phase: 3 },
  volcano: { label: 'Volcano', shape: 'Volcano', phase: 3 },
  histogram: { label: 'Histogram', shape: 'Column', phase: 3 },
  paired: { label: 'Paired', shape: 'Two conditions', phase: 3 },
};

export const plotOrder: PlotType[] = [
  'bar',
  'dot',
  'heatmap',
  'box',
  'violin',
  'groupedBar',
  'scatter',
  'line',
  'raincloud',
  'volcano',
  'histogram',
  'paired',
];

export function isImplemented(plot: PlotType): boolean {
  return plot in builders;
}
