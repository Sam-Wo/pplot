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
  {
    id: 'multivariate',
    name: 'Multivariate samples',
    description: 'Many numeric features per sample + a class column — for PCA, correlation, SPLOM.',
    suggested: 'pca',
    build: () =>
      table([
        text('Class', [
          'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
          'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',
          'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C',
        ]),
        num('Feature 1', [
          5.1, 4.9, 4.7, 5.0, 5.4, 4.6, 5.0, 4.4,
          7.0, 6.4, 6.9, 6.5, 6.3, 6.6, 5.9, 6.7,
          6.3, 5.8, 7.1, 6.3, 6.5, 7.6, 4.9, 7.3,
        ]),
        num('Feature 2', [
          3.5, 3.0, 3.2, 3.6, 3.9, 3.4, 3.4, 2.9,
          3.2, 3.2, 3.1, 2.8, 2.5, 3.0, 3.0, 3.1,
          3.3, 2.7, 3.0, 2.9, 3.0, 3.0, 2.5, 2.9,
        ]),
        num('Feature 3', [
          1.4, 1.4, 1.3, 1.4, 1.7, 1.4, 1.5, 1.4,
          4.7, 4.5, 4.9, 4.6, 4.9, 4.4, 4.2, 4.4,
          6.0, 5.1, 5.9, 5.6, 5.8, 6.6, 4.5, 6.3,
        ]),
        num('Feature 4', [
          0.2, 0.2, 0.2, 0.2, 0.4, 0.3, 0.2, 0.2,
          1.4, 1.5, 1.5, 1.5, 1.5, 1.4, 1.5, 1.4,
          2.5, 1.9, 2.1, 1.8, 2.2, 2.1, 1.7, 1.8,
        ]),
      ]),
  },
  {
    id: 'survival',
    name: 'Survival (time-to-event)',
    description: 'Time + event (1 = event, 0 = censored) + treatment arm — for Kaplan–Meier.',
    suggested: 'kaplanMeier',
    build: () =>
      table([
        num('Time (months)', [
          2, 3, 4, 6, 8, 9, 11, 13, 16, 18, 22, 24,
          5, 7, 10, 12, 14, 17, 19, 21, 23, 25, 27, 30,
        ]),
        num('Event', [
          1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0,
          1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0,
        ]),
        text('Arm', [
          'Placebo', 'Placebo', 'Placebo', 'Placebo', 'Placebo', 'Placebo',
          'Placebo', 'Placebo', 'Placebo', 'Placebo', 'Placebo', 'Placebo',
          'Treatment', 'Treatment', 'Treatment', 'Treatment', 'Treatment', 'Treatment',
          'Treatment', 'Treatment', 'Treatment', 'Treatment', 'Treatment', 'Treatment',
        ]),
      ]),
  },
];

export const firstRunExample = examples[0];
