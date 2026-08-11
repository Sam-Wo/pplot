import { useStore } from '../../state/store';

// Header: brand + synthetic-data note (§10).
export function Header() {
  const source = useStore((s) => s.table.source);
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
      <div className="flex items-baseline gap-3">
        <span className="font-data text-lg font-bold tracking-tight text-ink">pplot</span>
        <span className="hidden text-xs text-ink-soft sm:inline">
          paste, shape, and export slide-ready figures
        </span>
      </div>
      {source === 'example' && (
        <span className="rounded-full bg-accent-weak px-2.5 py-1 font-data text-[11px] font-medium text-accent-hover">
          Synthetic example data
        </span>
      )}
    </header>
  );
}
