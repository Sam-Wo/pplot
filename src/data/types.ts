// The data model (§5). Prism feels good because its typed tables encode
// structure; this is our simpler, typed reproduction of that abstraction.

export type ColumnType = 'numeric' | 'text';

export type Cell = number | string | null;

export interface Column {
  name: string;
  type: ColumnType;
  values: Cell[];
}

export type TableSource = 'file' | 'paste' | 'example' | 'manual';

export interface Table {
  columns: Column[];
  nRows: number;
  source: TableSource;
}

// Dataset shapes the tool understands. We auto-detect a default and let the
// user override via the role UI.
export type DatasetShape = 'column' | 'grouped' | 'xy' | 'matrix' | 'long' | 'volcano';

// Role mapping connects columns to plot slots.
export interface Mapping {
  value?: string[]; // numeric columns as groups/series (Column shape)
  x?: string;
  y?: string[];
  group?: string; // categorical color/subgroup
  facet?: string; // small multiples (stretch)
  label?: string; // heatmap row labels / point labels
  log2fc?: string; // volcano
  pvalue?: string; // volcano
}

export type PlotType =
  | 'bar'
  | 'dot'
  | 'heatmap'
  | 'box'
  | 'violin'
  | 'groupedBar'
  | 'scatter'
  | 'line'
  | 'raincloud'
  | 'volcano'
  | 'histogram'
  | 'paired';

export type ErrorKind = 'sd' | 'sem' | 'ci95' | 'none';
export type CenterKind = 'mean' | 'median';
export type PaletteName = 'okabeIto' | 'tolBright' | 'tolMuted' | 'grayscale';
export type SequentialScale = 'viridis' | 'cividis';
export type DivergingScale = 'blueRed';
export type TrendlineKind = 'none' | 'linear' | 'loess';
export type ViolinSide = 'both' | 'half';

// One options bag shared across plots; each builder reads the fields it needs.
export interface PlotOptions {
  // shared appearance
  title: string;
  xTitle: string;
  yTitle: string;
  palette: PaletteName;
  transparent: boolean;

  // bar / dot
  error: ErrorKind;
  center: CenterKind;
  showPoints: boolean;
  jitterWidth: number;

  // heatmap
  zscoreRows: boolean;
  sequentialScale: SequentialScale;
  divergingScale: DivergingScale;

  // box / violin
  boxNotched: boolean;
  violinSide: ViolinSide;
  violinShowBox: boolean;

  // grouped bar
  barStacked: boolean;

  // scatter / line
  trendline: TrendlineKind;
  loessSpan: number; // 0..1, fraction of points in each local fit
  lineMarkers: boolean;
  lineRibbon: boolean; // mean ± SD ribbon over replicate x values
  hoverUnified: boolean; // x-unified hover (good for time-courses)
}

export const defaultOptions: PlotOptions = {
  title: '',
  xTitle: '',
  yTitle: '',
  palette: 'okabeIto',
  transparent: false,
  error: 'sd',
  center: 'mean',
  showPoints: true,
  jitterWidth: 0.28,
  zscoreRows: false,
  sequentialScale: 'viridis',
  divergingScale: 'blueRed',
  boxNotched: false,
  violinSide: 'both',
  violinShowBox: true,
  barStacked: false,
  trendline: 'linear',
  loessSpan: 0.6,
  lineMarkers: true,
  lineRibbon: true,
  hoverUnified: false,
};
