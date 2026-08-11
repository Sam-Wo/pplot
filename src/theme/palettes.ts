import type { PaletteName, SequentialScale, DivergingScale } from '../data/types';

// Qualitative palettes (§10). Okabe–Ito is the colorblind-safe default.
export const palettes: Record<PaletteName, string[]> = {
  okabeIto: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#666666'],
  tolBright: ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'],
  tolMuted: ['#332288', '#88CCEE', '#44AA99', '#117733', '#999933', '#DDCC77', '#CC6677', '#882255', '#AA4499'],
  grayscale: ['#222222', '#666666', '#999999', '#BBBBBB', '#444444', '#777777', '#AAAAAA', '#CCCCCC'],
};

export const paletteLabels: Record<PaletteName, string> = {
  okabeIto: 'Okabe–Ito (colorblind-safe)',
  tolBright: 'Paul Tol · bright',
  tolMuted: 'Paul Tol · muted',
  grayscale: 'Grayscale',
};

export function paletteColor(palette: PaletteName, i: number): string {
  const p = palettes[palette];
  return p[i % p.length];
}

// Sequential scales for raw heatmaps — Plotly built-in names.
export const sequentialScales: Record<SequentialScale, string> = {
  viridis: 'Viridis',
  cividis: 'Cividis',
};

// Diverging scale for z-scored heatmaps (blue–white–red, used with zmid: 0).
export const divergingScales: Record<DivergingScale, Array<[number, string]>> = {
  blueRed: [
    [0, '#2166AC'],
    [0.5, '#F7F7F7'],
    [1, '#B2182B'],
  ],
};
