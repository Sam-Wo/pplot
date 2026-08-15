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
  time?: string; // Kaplan–Meier time-to-event
  event?: string; // Kaplan–Meier event indicator (1 = event, 0 = censored)
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
  | 'doseResponse'
  | 'raincloud'
  | 'volcano'
  | 'histogram'
  | 'paired'
  | 'pie'
  | 'kaplanMeier'
  | 'groupedScatter';

export type ErrorKind = 'sd' | 'sem' | 'ci95' | 'none';
export type CenterKind = 'mean' | 'median';
export type PaletteName = 'okabeIto' | 'tolBright' | 'tolMuted' | 'grayscale';
export type SequentialScale = 'viridis' | 'cividis';
export type DivergingScale = 'blueRed';
export type TrendlineKind = 'none' | 'linear' | 'loess';
export type ViolinSide = 'both' | 'half';
export type SignificanceMode = 'none' | 'adjacent' | 'vsFirst';
export type SigTest = 'welch' | 'student';
export type SigLabel = 'stars' | 'p';
export type HistNorm = 'count' | 'probability' | 'density';
export type AxisScale = 'linear' | 'log10' | 'log2';
export type DRModel = '4pl' | '3pl';

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

  // axis scales (XY family)
  xScale: AxisScale;
  yScale: AxisScale;

  // dose–response / IC50
  drModel: DRModel;
  drShowIC50: boolean;

  // significance annotations (display-only; computed via lib/tests)
  significance: SignificanceMode;
  sigTest: SigTest;
  sigLabel: SigLabel;

  // volcano
  fcThreshold: number; // |log2FC| cutoff
  pThreshold: number; // p-value cutoff
  labelSignificant: boolean;

  // histogram
  histBins: number; // 0 = auto
  histNorm: HistNorm;
  histDensity: boolean; // overlay KDE

  // paired
  pairedColorByDirection: boolean;

  // pie / parts-of-whole
  pieDonut: boolean;
  pieShowValues: boolean;

  // Kaplan–Meier survival
  kmShowCI: boolean;
  kmShowCensor: boolean;
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
  xScale: 'linear',
  yScale: 'linear',
  drModel: '4pl',
  drShowIC50: true,
  significance: 'none',
  sigTest: 'welch',
  sigLabel: 'stars',
  fcThreshold: 1,
  pThreshold: 0.05,
  labelSignificant: true,
  histBins: 0,
  histNorm: 'count',
  histDensity: false,
  pairedColorByDirection: true,
  pieDonut: true,
  pieShowValues: true,
  kmShowCI: true,
  kmShowCensor: true,
};
