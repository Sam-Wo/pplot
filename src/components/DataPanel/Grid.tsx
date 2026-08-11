import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { Button } from '../ui';

// Editable grid (§6c). Phase 1 ships a simple controlled grid; Glide Data Grid
// swaps in at Phase 2. Edits commit on blur/Enter (debounce-equivalent) and flow
// back into the Table, retyping the column and redrawing the figure.
export function Grid() {
  const table = useStore((s) => s.table);
  const updateCell = useStore((s) => s.updateCell);
  const renameColumn = useStore((s) => s.renameColumn);
  const addRow = useStore((s) => s.addRow);
  const addColumn = useStore((s) => s.addColumn);
  const clearData = useStore((s) => s.clearData);

  const empty = table.columns.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Data</span>
        <span className="font-data text-[11px] text-ink-soft">
          {table.nRows} × {table.columns.length}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button onClick={addRow} title="Add a row">+ Row</Button>
          <Button onClick={addColumn} title="Add a column">+ Column</Button>
          <Button onClick={clearData} title="Clear all data">Clear</Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {empty ? (
          <div className="flex h-full items-center justify-center px-4 py-8 text-center text-sm text-ink-soft">
            No data. Load an example, import a file, or paste a range.
          </div>
        ) : (
          <table className="border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 w-10 border-b border-r border-line bg-bg" />
                {table.columns.map((c, ci) => (
                  <th
                    key={ci}
                    className="min-w-[7rem] border-b border-r border-line bg-bg px-1 py-1 text-left align-top"
                  >
                    <HeaderInput value={c.name} onCommit={(v) => renameColumn(ci, v)} />
                    <span className="block px-1 font-data text-[10px] uppercase tracking-wide text-ink-soft">
                      {c.type}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: table.nRows }, (_, r) => (
                <tr key={r}>
                  <td className="sticky left-0 z-10 border-b border-r border-line bg-bg px-2 text-center font-data text-[11px] text-ink-soft">
                    {r + 1}
                  </td>
                  {table.columns.map((c, ci) => {
                    const v = c.values[r];
                    const str = v === null || v === undefined ? '' : String(v);
                    return (
                      <td key={ci} className="border-b border-r border-line p-0">
                        <CellInput
                          value={str}
                          numeric={c.type === 'numeric'}
                          onCommit={(nv) => updateCell(ci, r, nv)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HeaderInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setLocal(value);
  }, [value, editing]);
  return (
    <input
      value={local}
      onFocus={() => setEditing(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="w-full bg-transparent px-1 font-data text-xs font-semibold text-ink outline-none focus:bg-accent-weak"
    />
  );
}

function CellInput({
  value,
  numeric,
  onCommit,
}: {
  value: string;
  numeric: boolean;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setLocal(value);
  }, [value, editing]);
  return (
    <input
      value={local}
      inputMode={numeric ? 'decimal' : 'text'}
      onFocus={() => setEditing(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={`w-full min-w-[7rem] bg-transparent px-2 py-1 font-data text-xs text-ink outline-none focus:bg-accent-weak ${
        numeric ? 'text-right' : 'text-left'
      }`}
    />
  );
}
