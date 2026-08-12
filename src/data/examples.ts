import type { Cell, ColumnType, PlotType, Table } from './types';

// Built-in synthetic datasets (§6d), one per shape. Clearly labelled synthetic.
// One is auto-loaded on first run so the canvas is never empty.

export interface Example {
  id: string;
  name: string;
  description: string;
  suggested: PlotType;
  build: () => Table;
}

function col(name: string, type: ColumnType, values: Cell[]) {
  return { name, type, values };
}

function num(name: string, values: (number | null)[]) {
  return col(name, 'numeric', values);
}

function text(name: string, values: (string | null)[]) {
  return col(name, 'text', values);
}

function table(columns: ReturnType<typeof col>[], source: Table['source'] = 'example'): Table {
  const nRows = columns.reduce((m, c) => Math.max(m, c.values.length), 0);
  return { columns, nRows, source };
}

export const examples: Example[] = [
  {
    id: 'treatment',
    name: 'Treatment × replicate',
    description: 'Wide/column shape — each condition is a column, rows are replicates.',
    suggested: 'bar',
    build: () =>
      table([
        num('Control', [4.2, 3.8, 4.5, 4.0, 3.9, 4.3]),
        num('Drug A', [6.1, 5.8, 6.4, 5.9, 6.2, 6.6]),
        num('Drug B', [5.2, 4.9, 5.5, 5.1, 5.3, 4.8]),
        num('Drug C', [7.4, 7.9, 7.1, 7.6, 8.0, 7.3]),
      ]),
  },
  {
    id: 'dose-response',
    name: 'Dose–response',
    description: 'XY shape — a dose column and one or more response series.',
    suggested: 'doseResponse',
    build: () =>
      table([
        num('Dose (nM)', [0.1, 0.3, 1, 3, 10, 30, 100, 300, 1000]),
        num('Compound A', [4, 6, 12, 28, 52, 78, 91, 97, 99]),
        num('Compound B', [2, 4, 7, 14, 30, 55, 78, 90, 95]),
      ]),
  },
  {
    id: 'expression-matrix',
    name: 'Marker expression',
    description: 'Matrix shape — a label column plus a numeric block, one value per cell.',
    suggested: 'heatmap',
    build: () =>
      table([
        text('Gene', ['GAPDH', 'MKI67', 'CD8A', 'FOXP3', 'IL2', 'PDCD1']),
        num('Sample 1', [12.4, 2.1, 8.9, 1.2, 0.4, 3.1]),
        num('Sample 2', [12.1, 6.8, 3.2, 1.0, 0.6, 2.8]),
        num('Sample 3', [11.9, 1.4, 9.4, 4.5, 5.2, 1.1]),
        num('Sample 4', [12.6, 7.2, 2.8, 5.1, 4.8, 0.9]),
        num('Sample 5', [12.2, 3.3, 6.1, 2.4, 2.1, 4.6]),
      ]),
  },
  {
    id: 'cytokine-timecourse',
    name: 'Two-way / tidy',
    description: 'Long shape — category + group + value, one row per observation.',
    suggested: 'groupedBar',
    build: () =>
      table([
        text('Timepoint', [
          '0h', '0h', '0h', '0h', '0h', '0h',
          '24h', '24h', '24h', '24h', '24h', '24h',
          '48h', '48h', '48h', '48h', '48h', '48h',
        ]),
        text('Treatment', [
          'Vehicle', 'Vehicle', 'Vehicle', 'Drug', 'Drug', 'Drug',
          'Vehicle', 'Vehicle', 'Vehicle', 'Drug', 'Drug', 'Drug',
          'Vehicle', 'Vehicle', 'Vehicle', 'Drug', 'Drug', 'Drug',
        ]),
        num('Level', [
          1.1, 1.3, 0.9, 1.2, 1.0, 1.4,
          2.1, 2.4, 1.9, 4.2, 4.8, 4.5,
          2.6, 2.2, 2.8, 7.1, 6.6, 7.4,
        ]),
      ]),
  },
  {
    id: 'volcano-de',
    name: 'Differential expression',
    description: 'Volcano shape — a log2 fold-change column and a p-value column.',
    suggested: 'volcano',
    build: () =>
      table([
        text('gene', [
          'TP53', 'EGFR', 'MYC', 'BRCA1', 'KRAS', 'PTEN', 'VEGFA', 'CDK4',
          'RB1', 'AKT1', 'MTOR', 'JUN', 'FOS', 'STAT3', 'NFKB1',
        ]),
        num('log2FC', [
          -2.3, 3.1, 2.7, -1.9, 1.2, -3.4, 2.1, 0.4,
          -0.3, 1.8, -2.6, 0.9, -1.1, 2.9, -0.6,
        ]),
        num('pValue', [
          1e-8, 3e-9, 2e-6, 4e-5, 0.02, 1e-10, 5e-7, 0.4,
          0.6, 8e-4, 2e-7, 0.08, 0.03, 6e-9, 0.3,
        ]),
      ]),
  },
];

export const firstRunExample = examples[0];
