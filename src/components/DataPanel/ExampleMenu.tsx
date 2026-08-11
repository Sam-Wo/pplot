import { useStore } from '../../state/store';
import { examples } from '../../data/examples';
import { plotMeta } from '../../plots';

// Built-in synthetic datasets (§6d), one per shape.
export function ExampleMenu() {
  const loadExample = useStore((s) => s.loadExample);
  return (
    <div className="flex flex-col gap-1.5">
      {examples.map((ex) => (
        <button
          key={ex.id}
          type="button"
          onClick={() => loadExample(ex.build, ex.suggested)}
          className="group flex items-center justify-between rounded border border-line bg-surface px-2.5 py-2 text-left transition hover:border-line-strong hover:bg-accent-weak"
        >
          <span>
            <span className="block text-sm font-medium text-ink">{ex.name}</span>
            <span className="block text-xs text-ink-soft">{ex.description}</span>
          </span>
          <span className="ml-2 shrink-0 rounded bg-bg px-1.5 py-0.5 font-data text-[10px] uppercase tracking-wide text-ink-soft">
            {plotMeta[ex.suggested].shape}
          </span>
        </button>
      ))}
      <p className="mt-0.5 text-[11px] text-ink-soft">Example data is synthetic.</p>
    </div>
  );
}
