import { useStore } from '../../state/store';
import { isImplemented } from '../../plots';
import { paletteLabels } from '../../theme/palettes';
import type {
  AxisScale,
  CenterKind,
  DRModel,
  ErrorKind,
  HistNorm,
  PaletteName,
  SequentialScale,
  SigLabel,
  SignificanceMode,
  SigTest,
  TrendlineKind,
  ViolinSide,
} from '../../data/types';
import { Field, Segmented, Select, Toggle } from '../ui';

// Style controls (§10). Depth over breadth: the few knobs that matter per plot.
export function StyleControls() {
  const plotType = useStore((s) => s.plotType);
  const o = useStore((s) => s.options);
  const set = useStore((s) => s.setOptions);

  if (!isImplemented(plotType)) {
    return <p className="text-xs text-ink-soft">Style options appear once this plot is available.</p>;
  }

  const isBarDot = plotType === 'bar' || plotType === 'dot';
  const isBox = plotType === 'box';
  const isViolin = plotType === 'violin';
  const isGrouped = plotType === 'groupedBar';
  const isScatter = plotType === 'scatter';
  const isLine = plotType === 'line';
  const isDose = plotType === 'doseResponse';
  const isXY = isScatter || isLine || isDose;
  const isHeatmap = plotType === 'heatmap';
  const isVolcano = plotType === 'volcano';
  const isHistogram = plotType === 'histogram';
  const isPaired = plotType === 'paired';
  const isColumn = isBarDot || isBox || isViolin;

  const significanceBlock = (
    <div className="mt-3 border-t border-line pt-3">
      <Field label="Significance">
        <Segmented<SignificanceMode>
          value={o.significance}
          onChange={(v) => set({ significance: v })}
          options={[
            { value: 'none', label: 'Off' },
            { value: 'adjacent', label: 'Adjacent' },
            { value: 'vsFirst', label: 'vs first' },
          ]}
        />
      </Field>
      {o.significance !== 'none' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Test">
            <Segmented<SigTest>
              value={o.sigTest}
              onChange={(v) => set({ sigTest: v })}
              options={[
                { value: 'welch', label: 'Welch' },
                { value: 'student', label: 'Student' },
              ]}
            />
          </Field>
          <Field label="Label">
            <Segmented<SigLabel>
              value={o.sigLabel}
              onChange={(v) => set({ sigLabel: v })}
              options={[
                { value: 'stars', label: 'Stars' },
                { value: 'p', label: 'p-value' },
              ]}
            />
          </Field>
        </div>
      )}
      {o.significance !== 'none' && (
        <p className="text-[11px] text-ink-soft">
          Pairwise two-sample t-tests. Display-only annotation.
        </p>
      )}
    </div>
  );

  const centerField = (
    <Field label="Centre">
      <Segmented<CenterKind>
        value={o.center}
        onChange={(v) => set({ center: v })}
        options={[
          { value: 'mean', label: 'Mean' },
          { value: 'median', label: 'Median' },
        ]}
      />
    </Field>
  );
  const errorField = (
    <Field label="Error bars">
      <Segmented<ErrorKind>
        value={o.error}
        onChange={(v) => set({ error: v })}
        options={[
          { value: 'sd', label: 'SD' },
          { value: 'sem', label: 'SEM' },
          { value: 'ci95', label: '95% CI' },
          { value: 'none', label: 'None' },
        ]}
      />
    </Field>
  );

  return (
    <div>
      <Field label="Title">
        <TextInput value={o.title} onChange={(v) => set({ title: v })} placeholder="Untitled figure" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="X axis">
          <TextInput value={o.xTitle} onChange={(v) => set({ xTitle: v })} placeholder="—" />
        </Field>
        <Field label="Y axis">
          <TextInput value={o.yTitle} onChange={(v) => set({ yTitle: v })} placeholder="Value" />
        </Field>
      </div>

      <Field label="Palette">
        <Select value={o.palette} onChange={(e) => set({ palette: e.target.value as PaletteName })}>
          {(Object.keys(paletteLabels) as PaletteName[]).map((p) => (
            <option key={p} value={p}>
              {paletteLabels[p]}
            </option>
          ))}
        </Select>
      </Field>

      {isBarDot && (
        <>
          {centerField}
          {errorField}
          <div className="mt-1">
            <Toggle checked={o.showPoints} onChange={(v) => set({ showPoints: v })} label="Show individual points" />
          </div>
        </>
      )}

      {isGrouped && (
        <>
          <Field label="Bars">
            <Segmented<'group' | 'stack'>
              value={o.barStacked ? 'stack' : 'group'}
              onChange={(v) => set({ barStacked: v === 'stack' })}
              options={[
                { value: 'group', label: 'Grouped' },
                { value: 'stack', label: 'Stacked' },
              ]}
            />
          </Field>
          {centerField}
          {errorField}
        </>
      )}

      {isBox && (
        <>
          <div className="mt-1 flex flex-col gap-1">
            <Toggle checked={o.showPoints} onChange={(v) => set({ showPoints: v })} label="Show points" />
            <Toggle checked={o.boxNotched} onChange={(v) => set({ boxNotched: v })} label="Notched" />
          </div>
        </>
      )}

      {isViolin && (
        <>
          <Field label="Shape">
            <Segmented<ViolinSide>
              value={o.violinSide}
              onChange={(v) => set({ violinSide: v })}
              options={[
                { value: 'both', label: 'Full' },
                { value: 'half', label: 'Half' },
              ]}
            />
          </Field>
          <div className="mt-1 flex flex-col gap-1">
            <Toggle checked={o.violinShowBox} onChange={(v) => set({ violinShowBox: v })} label="Inner box" />
            <Toggle checked={o.showPoints} onChange={(v) => set({ showPoints: v })} label="Show points" />
          </div>
        </>
      )}

      {isScatter && (
        <>
          <Field label="Trendline">
            <Segmented<TrendlineKind>
              value={o.trendline}
              onChange={(v) => set({ trendline: v })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'linear', label: 'Linear' },
                { value: 'loess', label: 'LOESS' },
              ]}
            />
          </Field>
          {o.trendline === 'loess' && (
            <Field label={`LOESS span · ${o.loessSpan.toFixed(2)}`}>
              <input
                type="range"
                min={0.2}
                max={0.9}
                step={0.05}
                value={o.loessSpan}
                onChange={(e) => set({ loessSpan: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>
          )}
          <div className="mt-1">
            <Toggle checked={o.hoverUnified} onChange={(v) => set({ hoverUnified: v })} label="Unified hover" />
          </div>
        </>
      )}

      {isLine && (
        <div className="mt-1 flex flex-col gap-1">
          <Toggle checked={o.lineMarkers} onChange={(v) => set({ lineMarkers: v })} label="Show markers" />
          <Toggle checked={o.lineRibbon} onChange={(v) => set({ lineRibbon: v })} label="± SD ribbon" />
          <Toggle checked={o.hoverUnified} onChange={(v) => set({ hoverUnified: v })} label="Unified hover" />
        </div>
      )}

      {isDose && (
        <>
          <Field label="Curve model">
            <Segmented<DRModel>
              value={o.drModel}
              onChange={(v) => set({ drModel: v })}
              options={[
                { value: '4pl', label: '4PL (variable)' },
                { value: '3pl', label: '3PL (fixed)' },
              ]}
            />
          </Field>
          <Toggle checked={o.drShowIC50} onChange={(v) => set({ drShowIC50: v })} label="Mark IC50" />
          <p className="mt-1 text-[11px] text-ink-soft">IC50, Hill slope, and R² show in the legend.</p>
        </>
      )}

      {isXY && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <Field label="X scale">
            <Segmented<AxisScale>
              value={o.xScale}
              onChange={(v) => set({ xScale: v })}
              options={[
                { value: 'linear', label: 'Lin' },
                { value: 'log10', label: 'log₁₀' },
                { value: 'log2', label: 'log₂' },
              ]}
            />
          </Field>
          <Field label="Y scale">
            <Segmented<AxisScale>
              value={o.yScale}
              onChange={(v) => set({ yScale: v })}
              options={[
                { value: 'linear', label: 'Lin' },
                { value: 'log10', label: 'log₁₀' },
                { value: 'log2', label: 'log₂' },
              ]}
            />
          </Field>
        </div>
      )}

      {isVolcano && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="|log₂FC| cutoff">
              <NumberInput value={o.fcThreshold} step={0.1} min={0} onChange={(v) => set({ fcThreshold: v })} />
            </Field>
            <Field label="p cutoff">
              <NumberInput value={o.pThreshold} step={0.01} min={0} max={1} onChange={(v) => set({ pThreshold: v })} />
            </Field>
          </div>
          <Toggle
            checked={o.labelSignificant}
            onChange={(v) => set({ labelSignificant: v })}
            label="Label significant"
          />
          <p className="mt-1 text-[11px] text-ink-soft">Click any point to pin its label.</p>
        </>
      )}

      {isHistogram && (
        <>
          <Field label={`Bins · ${o.histBins === 0 ? 'auto' : o.histBins}`}>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={o.histBins}
              onChange={(e) => set({ histBins: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </Field>
          <Field label="Normalize">
            <Segmented<HistNorm>
              value={o.histNorm}
              onChange={(v) => set({ histNorm: v })}
              options={[
                { value: 'count', label: 'Count' },
                { value: 'probability', label: 'Prob.' },
                { value: 'density', label: 'Density' },
              ]}
            />
          </Field>
          <Toggle checked={o.histDensity} onChange={(v) => set({ histDensity: v })} label="Density curve (KDE)" />
        </>
      )}

      {isPaired && (
        <div className="mt-1">
          <Toggle
            checked={o.pairedColorByDirection}
            onChange={(v) => set({ pairedColorByDirection: v })}
            label="Colour by direction"
          />
        </div>
      )}

      {isHeatmap && (
        <>
          <div className="mb-2">
            <Toggle checked={o.zscoreRows} onChange={(v) => set({ zscoreRows: v })} label="Z-score rows" />
          </div>
          {!o.zscoreRows ? (
            <Field label="Colour scale">
              <Segmented<SequentialScale>
                value={o.sequentialScale}
                onChange={(v) => set({ sequentialScale: v })}
                options={[
                  { value: 'viridis', label: 'Viridis' },
                  { value: 'cividis', label: 'Cividis' },
                ]}
              />
            </Field>
          ) : (
            <p className="text-xs text-ink-soft">Diverging blue–white–red, centred at zero.</p>
          )}
        </>
      )}

      {isColumn && significanceBlock}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none transition focus:border-accent"
    />
  );
}

function NumberInput({
  value,
  onChange,
  step,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      className="w-full rounded border border-line bg-surface px-2 py-1.5 font-data text-sm text-ink outline-none transition focus:border-accent"
    />
  );
}
