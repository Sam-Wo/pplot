import { useCallback, useMemo } from 'react';
import { useStore } from '../../state/store';
import { builders, isImplemented, plotMeta } from '../../plots';
import type { PlotType } from '../../data/types';
import { baseConfig } from '../../theme/plotlyTheme';
import { usePlotly } from './usePlotly';
import { attachHover } from './hover';
import { usePlotElement } from './context';

export function Plot() {
  const ref = usePlotElement();
  const table = useStore((s) => s.table);
  const mapping = useStore((s) => s.mapping);
  const plotType = useStore((s) => s.plotType);
  const options = useStore((s) => s.options);

  const hasData = table.columns.length > 0 && table.nRows > 0;
  const impl = isImplemented(plotType) && hasData;

  const { traces, layout } = useMemo(() => {
    if (!impl) return { traces: [], layout: {} };
    return builders[plotType]!(table, mapping, options);
  }, [impl, plotType, table, mapping, options]);

  const attach = useCallback((gd: HTMLDivElement) => attachHover(gd, plotType), [plotType]);

  usePlotly(ref, traces, layout, baseConfig, attach);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      {!impl && <Placeholder plotType={plotType} hasData={hasData} />}
    </div>
  );
}

function Placeholder({ plotType, hasData }: { plotType: PlotType; hasData: boolean }) {
  const info = plotMeta[plotType];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/75">
      <div className="max-w-sm px-6 text-center">
        {!hasData ? (
          <>
            <p className="text-sm font-medium text-ink">No data yet</p>
            <p className="mt-1 text-sm text-ink-soft">
              Load an example, import a file, or paste a range to begin.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">{info.label} arrives in Phase {info.phase}</p>
            <p className="mt-1 text-sm text-ink-soft">
              Phase 1 ships bar, dot, and heatmap. Pick one of those to render this data now.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
