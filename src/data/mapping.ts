import type { Cell, Column, DatasetShape, Mapping, PlotType, Table } from './types';

// Role mapping + shape adapters (§5). Smart defaults, never block on ambiguity:
// pick something sane and let the role UI correct it.

export function getColumn(table: Table, name: string | undefined): Column | undefined {
  return name ? table.columns.find((c) => c.name === name) : undefined;
}

export function numericColumns(table: Table): Column[] {
  return table.columns.filter((c) => c.type === 'numeric');
}

export function textColumns(table: Table): Column[] {
  return table.columns.filter((c) => c.type === 'text');
}

// Finite numeric values of a column, blanks dropped.
export function numericValues(col: Column): number[] {
  return col.values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

export function columnStrings(col: Column): string[] {
  return col.values.map((v) => (v === null ? '' : String(v)));
}

export function detectShape(table: Table): DatasetShape {
  const nums = numericColumns(table).length;
  const texts = textColumns(table).length;
  if (nums === 0) return 'column';
  if (texts >= 1 && nums >= 3) return 'matrix'; // label + wide numeric block
  if (texts >= 2 && nums >= 1) return 'long';
  return 'column';
}

export function defaultPlotType(table: Table): PlotType {
  const shape = detectShape(table);
  if (shape === 'matrix') return 'heatmap';
  if (shape === 'long') return 'groupedBar';
  return 'bar';
}

// Sensible default role assignment for a given plot type.
export function defaultMapping(table: Table, plot: PlotType): Mapping {
  const nums = numericColumns(table).map((c) => c.name);
  const texts = textColumns(table).map((c) => c.name);
  switch (plot) {
    case 'heatmap':
      return { value: nums, label: texts[0] };
    case 'scatter':
    case 'line':
    case 'doseResponse': {
      const x = nums[0] ?? texts[0];
      const y = nums.filter((n) => n !== x);
      return { x, y: y.length ? y : nums.slice(0, 1), group: texts[0] };
    }
    case 'groupedBar':
    case 'groupedScatter':
      return { x: texts[0], group: texts[1], value: nums.slice(0, 1) };
    case 'volcano':
      return { log2fc: nums[0], pvalue: nums[1], label: texts[0] };
    case 'paired':
      return { value: nums.slice(0, 2), label: texts[0] };
    case 'pie':
      return { label: texts[0], value: nums.slice(0, 1) };
    case 'kaplanMeier':
      return { time: nums[0], event: nums[1], group: texts[0] };
    case 'box':
    case 'violin':
    case 'histogram':
    case 'raincloud':
    case 'bar':
    case 'dot':
    default:
      return { value: nums, label: texts[0] };
  }
}

// Re-derive a valid mapping when switching plot type, preserving what still fits.
export function remapForPlot(table: Table, plot: PlotType, prev: Mapping): Mapping {
  const fresh = defaultMapping(table, plot);
  // Keep a previously chosen label if it is still a real column.
  if (prev.label && getColumn(table, prev.label)) fresh.label = prev.label;
  return fresh;
}

// --- Column-shape extraction (bar, dot) -------------------------------------

export interface Group {
  name: string;
  values: number[];
}

// Each mapped value column becomes one group; its numeric cells are replicates.
export function groupsFromValue(table: Table, mapping: Mapping): Group[] {
  const names = mapping.value ?? numericColumns(table).map((c) => c.name);
  const groups: Group[] = [];
  for (const name of names) {
    const col = getColumn(table, name);
    if (col && col.type === 'numeric') groups.push({ name, values: numericValues(col) });
  }
  return groups;
}

// --- Matrix extraction (heatmap) --------------------------------------------

export interface MatrixData {
  rowLabels: string[];
  colLabels: string[];
  z: (number | null)[][]; // z[row][col]
}

export function matrixFromMapping(table: Table, mapping: Mapping): MatrixData {
  const colLabels = mapping.value ?? numericColumns(table).map((c) => c.name);
  const cols = colLabels.map((n) => getColumn(table, n)).filter((c): c is Column => !!c);
  const labelCol = getColumn(table, mapping.label);
  const nRows = cols.reduce((m, c) => Math.max(m, c.values.length), 0);
  const rowLabels = Array.from({ length: nRows }, (_, r) =>
    labelCol && labelCol.values[r] != null ? String(labelCol.values[r]) : `Row ${r + 1}`
  );
  const z: (number | null)[][] = Array.from({ length: nRows }, (_, r) =>
    cols.map((c) => {
      const v = c.values[r];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    })
  );
  return { rowLabels, colLabels: cols.map((c) => c.name), z };
}

// --- XY extraction (scatter, line) ------------------------------------------

export interface Series {
  name: string;
  x: number[];
  y: number[];
}

function asNumber(v: Cell): number {
  if (typeof v === 'number') return v;
  if (v === null) return NaN;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

// One X column + one or more Y columns. With a single Y and a group column,
// points split into a series per group (color-by-group). With multiple Y
// columns, each Y is its own series.
export function xyFromMapping(table: Table, mapping: Mapping): { xName: string; series: Series[] } {
  const xCol = getColumn(table, mapping.x);
  const yNames = (mapping.y ?? []).filter((n) => getColumn(table, n));
  if (!xCol || yNames.length === 0) return { xName: mapping.x ?? '', series: [] };
  const xNum = xCol.values.map(asNumber);
  const groupCol = getColumn(table, mapping.group);
  const series: Series[] = [];

  if (groupCol && yNames.length === 1) {
    const yCol = getColumn(table, yNames[0])!;
    const groups = new Map<string, Series>();
    for (let r = 0; r < table.nRows; r++) {
      const yv = asNumber(yCol.values[r]);
      const xv = xNum[r];
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      const g = groupCol.values[r] == null ? '—' : String(groupCol.values[r]);
      if (!groups.has(g)) groups.set(g, { name: g, x: [], y: [] });
      const s = groups.get(g)!;
      s.x.push(xv);
      s.y.push(yv);
    }
    series.push(...groups.values());
  } else {
    for (const yn of yNames) {
      const yCol = getColumn(table, yn)!;
      const s: Series = { name: yn, x: [], y: [] };
      for (let r = 0; r < table.nRows; r++) {
        const yv = asNumber(yCol.values[r]);
        const xv = xNum[r];
        if (Number.isFinite(xv) && Number.isFinite(yv)) {
          s.x.push(xv);
          s.y.push(yv);
        }
      }
      series.push(s);
    }
  }
  return { xName: xCol.name, series };
}

// --- Two-way / tidy extraction (grouped bar, grouped box/violin) ------------

export interface TwoWay {
  categories: string[]; // x-axis categories, first-seen order
  groups: { name: string; byCategory: number[][] }[]; // byCategory[i] ↔ categories[i]
}

// category column (x) × group column × one numeric value column, in long form.
export function twoWayFromMapping(table: Table, mapping: Mapping): TwoWay {
  const catCol = getColumn(table, mapping.x);
  const groupCol = getColumn(table, mapping.group);
  const valCol = getColumn(table, mapping.value?.[0]);
  if (!catCol || !groupCol || !valCol) return { categories: [], groups: [] };

  const categories: string[] = [];
  const groupNames: string[] = [];
  const catIndex = new Map<string, number>();
  const grpIndex = new Map<string, number>();
  const cells: number[][][] = []; // [group][category] → raw values

  for (let r = 0; r < table.nRows; r++) {
    const c = catCol.values[r] == null ? '' : String(catCol.values[r]);
    const g = groupCol.values[r] == null ? '' : String(groupCol.values[r]);
    const v = asNumber(valCol.values[r]);
    if (c === '' || g === '' || !Number.isFinite(v)) continue;
    if (!catIndex.has(c)) {
      catIndex.set(c, categories.length);
      categories.push(c);
    }
    if (!grpIndex.has(g)) {
      grpIndex.set(g, groupNames.length);
      groupNames.push(g);
      cells.push([]);
    }
    const ci = catIndex.get(c)!;
    const gi = grpIndex.get(g)!;
    (cells[gi][ci] ??= []).push(v);
  }

  const groups = groupNames.map((name, gi) => ({
    name,
    byCategory: categories.map((_, ci) => cells[gi][ci] ?? []),
  }));
  return { categories, groups };
}

// --- Parts-of-whole extraction (pie) ----------------------------------------

export interface Parts {
  labels: string[];
  values: number[];
}

// A label column + one value column, summed by label (so repeated categories
// aggregate). With no label column, each row of the value column is its own
// slice labelled by row.
export function partsFromMapping(table: Table, mapping: Mapping): Parts {
  const valCol = getColumn(table, mapping.value?.[0]) ?? numericColumns(table)[0];
  if (!valCol) return { labels: [], values: [] };
  const labelCol = getColumn(table, mapping.label);
  const order: string[] = [];
  const sums = new Map<string, number>();
  for (let r = 0; r < valCol.values.length; r++) {
    const v = asNumber(valCol.values[r]);
    if (!Number.isFinite(v)) continue;
    const key = labelCol && labelCol.values[r] != null ? String(labelCol.values[r]) : `Item ${r + 1}`;
    if (!sums.has(key)) order.push(key);
    sums.set(key, (sums.get(key) ?? 0) + v);
  }
  return { labels: order, values: order.map((k) => sums.get(k) ?? 0) };
}

// --- Survival extraction (Kaplan–Meier) -------------------------------------

export interface SurvivalGroup {
  name: string;
  obs: { time: number; event: boolean }[];
}

// time column + event indicator (1/true = event, 0/false/blank = censored),
// optionally split by a group column. Event values parse leniently
// ("1","yes","true","dead","event" → event).
export function survivalFromMapping(table: Table, mapping: Mapping): SurvivalGroup[] {
  const timeCol = getColumn(table, mapping.time);
  if (!timeCol) return [];
  const eventCol = getColumn(table, mapping.event);
  const groupCol = getColumn(table, mapping.group);
  const isEvent = (c: Cell): boolean => {
    if (c == null) return false;
    if (typeof c === 'number') return c !== 0;
    const s = String(c).trim().toLowerCase();
    return s === '1' || s === 'yes' || s === 'true' || s === 'dead' || s === 'event' || s === 'y';
  };

  const map = new Map<string, SurvivalGroup>();
  for (let r = 0; r < table.nRows; r++) {
    const t = asNumber(timeCol.values[r]);
    if (!Number.isFinite(t)) continue;
    // No event column → treat every observation as an event.
    const event = eventCol ? isEvent(eventCol.values[r]) : true;
    const g = groupCol && groupCol.values[r] != null ? String(groupCol.values[r]) : 'All';
    if (!map.has(g)) map.set(g, { name: g, obs: [] });
    map.get(g)!.obs.push({ time: t, event });
  }
  return [...map.values()];
}
