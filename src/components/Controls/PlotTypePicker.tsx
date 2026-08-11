import { useStore } from '../../state/store';
import { isImplemented, plotMeta, plotOrder } from '../../plots';

// Active plot type carries an accent left-border — encodes state truthfully, no
// decorative numbering (§10). Phase 2/3 types are listed but disabled so the
// roadmap is visible without dead-ends.
export function PlotTypePicker() {
  const plotType = useStore((s) => s.plotType);
  const setPlotType = useStore((s) => s.setPlotType);

  return (
    <div className="flex flex-col gap-1">
      {plotOrder.map((p) => {
        const info = plotMeta[p];
        const ready = isImplemented(p);
        const active = plotType === p;
        return (
          <button
            key={p}
            type="button"
            disabled={!ready}
            onClick={() => setPlotType(p)}
            className={`flex items-center justify-between rounded border-l-2 px-2.5 py-1.5 text-left text-sm transition ${
              active
                ? 'border-l-accent bg-accent-weak font-medium text-ink'
                : 'border-l-transparent text-ink hover:bg-bg'
            } ${!ready ? 'cursor-not-allowed opacity-45' : ''}`}
          >
            <span>{info.label}</span>
            <span className="ml-2 font-data text-[10px] uppercase tracking-wide text-ink-soft">
              {ready ? info.shape : `Phase ${info.phase}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
