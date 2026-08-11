import type { Mapping, PlotOptions, PlotType, Table } from '../data/types';
import { defaultOptions } from '../data/types';

// Project save/load (§9). Serialize the exact inputs + settings so a figure is
// reproducible — the Prism-project echo.

export interface ProjectState {
  table: Table;
  mapping: Mapping;
  plotType: PlotType;
  options: PlotOptions;
}

interface ProjectFile extends ProjectState {
  format: 'pplot';
  version: 1;
}

export function serializeProject(state: ProjectState): string {
  const file: ProjectFile = { format: 'pplot', version: 1, ...state };
  return JSON.stringify(file, null, 2);
}

export function downloadProject(state: ProjectState, name = 'figure'): void {
  const blob = new Blob([serializeProject(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.pplot.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Parse + normalize a project file. Options are merged onto defaults so files
// written by older builds still open with every field present.
export function parseProject(text: string): ProjectState {
  const raw = JSON.parse(text) as Partial<ProjectFile>;
  if (!raw || raw.format !== 'pplot' || !raw.table || !raw.options) {
    throw new Error('Not a pplot project file.');
  }
  return {
    table: raw.table,
    mapping: raw.mapping ?? {},
    plotType: raw.plotType ?? 'bar',
    options: { ...defaultOptions, ...raw.options },
  };
}
