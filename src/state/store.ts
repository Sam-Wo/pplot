import { create } from 'zustand';
import type { Cell, Column, Mapping, PlotOptions, PlotType, Table } from '../data/types';
import { defaultOptions } from '../data/types';
import { defaultMapping, defaultPlotType, remapForPlot } from '../data/mapping';
import { emptyTable, retypeColumn } from '../data/parse';
import { firstRunExample } from '../data/examples';

interface AppState {
  table: Table;
  plotType: PlotType;
  mapping: Mapping;
  options: PlotOptions;

  // Fresh data → reset the plot type + mapping to sensible defaults.
  setTable: (table: Table) => void;
  loadExample: (build: () => Table, suggested: PlotType) => void;

  // Restore a saved project verbatim (reproducibility, §9).
  loadProject: (p: { table: Table; mapping: Mapping; plotType: PlotType; options: PlotOptions }) => void;

  setPlotType: (plot: PlotType) => void; // preserve roles that still fit
  setMapping: (patch: Partial<Mapping>) => void;
  setOptions: (patch: Partial<PlotOptions>) => void;

  // Grid editing (§6c).
  updateCell: (colIndex: number, rowIndex: number, raw: string) => void;
  renameColumn: (colIndex: number, name: string) => void;
  addRow: () => void;
  addColumn: () => void;
  clearData: () => void;
}

function adopt(table: Table): Pick<AppState, 'table' | 'plotType' | 'mapping'> {
  const plotType = defaultPlotType(table);
  return { table, plotType, mapping: defaultMapping(table, plotType) };
}

const initial = firstRunExample.build();

export const useStore = create<AppState>((set) => ({
  ...adopt(initial),
  options: { ...defaultOptions },

  setTable: (table) => set(adopt(table)),

  loadExample: (build, suggested) =>
    set((s) => {
      const table = build();
      const options =
        suggested === 'doseResponse' && s.options.xScale === 'linear'
          ? { ...s.options, xScale: 'log10' as const }
          : s.options;
      return { table, plotType: suggested, mapping: defaultMapping(table, suggested), options };
    }),

  loadProject: (p) =>
    set(() => ({
      table: p.table,
      mapping: p.mapping,
      plotType: p.plotType,
      options: p.options,
    })),

  setPlotType: (plot) =>
    set((s) => {
      const mapping = remapForPlot(s.table, plot, s.mapping);
      // Dose–response is read on a log-concentration x-axis by convention; adopt
      // it when the user hasn't deliberately chosen a scale.
      const options =
        plot === 'doseResponse' && s.options.xScale === 'linear'
          ? { ...s.options, xScale: 'log10' as const }
          : s.options;
      return { plotType: plot, mapping, options };
    }),

  setMapping: (patch) => set((s) => ({ mapping: { ...s.mapping, ...patch } })),

  setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),

  updateCell: (colIndex, rowIndex, raw) =>
    set((s) => {
      const columns = s.table.columns.slice();
      const target = columns[colIndex];
      if (!target) return {};
      const values = target.values.slice();
      values[rowIndex] = raw.trim() === '' ? null : raw;
      columns[colIndex] = retypeColumn(target.name, values);
      return { table: { ...s.table, columns } };
    }),

  renameColumn: (colIndex, name) =>
    set((s) => {
      const columns = s.table.columns.slice();
      const target = columns[colIndex];
      if (!target) return {};
      const nextName = name.trim() || target.name;
      const oldName = target.name;
      columns[colIndex] = { ...target, name: nextName };
      // Keep the mapping pointing at the renamed column.
      const mapping = renameInMapping(s.mapping, oldName, nextName);
      return { table: { ...s.table, columns }, mapping };
    }),

  addRow: () =>
    set((s) => {
      const columns = s.table.columns.map((c) => ({ ...c, values: [...c.values, null] }));
      return { table: { ...s.table, columns, nRows: s.table.nRows + 1 } };
    }),

  addColumn: () =>
    set((s) => {
      const n = s.table.columns.length + 1;
      const rows = Math.max(s.table.nRows, 1);
      const fresh: Column = {
        name: `Column ${n}`,
        type: 'numeric',
        values: Array.from({ length: rows }, () => null as Cell),
      };
      return {
        table: { ...s.table, columns: [...s.table.columns, fresh], nRows: rows },
      };
    }),

  clearData: () => set(() => adopt(emptyTable('manual'))),
}));

function renameInMapping(m: Mapping, oldName: string, newName: string): Mapping {
  const swap = (v?: string) => (v === oldName ? newName : v);
  const swapArr = (v?: string[]) => v?.map((x) => (x === oldName ? newName : x));
  return {
    ...m,
    value: swapArr(m.value),
    y: swapArr(m.y),
    x: swap(m.x),
    group: swap(m.group),
    facet: swap(m.facet),
    label: swap(m.label),
    log2fc: swap(m.log2fc),
    pvalue: swap(m.pvalue),
  };
}
