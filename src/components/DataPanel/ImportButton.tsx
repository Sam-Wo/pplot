import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useStore } from '../../state/store';
import {
  defaultDelimitedOptions,
  loadFile,
  parseDelimited,
  tableFromCellRows,
} from '../../data/parse';
import type { Cell } from '../../data/types';

// File import (§6b): drag-drop + picker for xlsx/xls/csv/tsv. Multi-sheet
// workbooks prompt for which sheet; CSVs get the same decimal/delimiter handling
// as paste (via the delimited pipeline in loadFile).
export function ImportButton() {
  const setTable = useStore((s) => s.setTable);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; rows: Cell[][] }[] | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setPending(null);
    try {
      const loaded = await loadFile(file);
      if (loaded.type === 'text') {
        setTable(parseDelimited(loaded.text, defaultDelimitedOptions, 'file'));
      } else if (loaded.sheets.length <= 1) {
        const sheet = loaded.sheets[0];
        if (!sheet) {
          setError('That workbook has no sheets.');
          return;
        }
        setTable(tableFromCellRows(sheet.rows, true, '.', 'file'));
      } else {
        setPending(loaded.sheets);
      }
    } catch {
      setError('Could not read that file.');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded border border-dashed px-3 py-4 text-center transition ${
          drag ? 'border-accent bg-accent-weak' : 'border-line-strong bg-bg'
        }`}
      >
        <p className="text-xs text-ink-soft">Drop a spreadsheet here</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 text-xs font-medium text-accent hover:underline"
        >
          or choose a file
        </button>
        <p className="mt-1 font-data text-[10px] uppercase tracking-wide text-ink-soft">
          xlsx · xls · csv · tsv
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {pending && (
        <div className="mt-2">
          <p className="mb-1 text-xs text-ink-soft">This workbook has several sheets — pick one:</p>
          <div className="flex flex-wrap gap-1">
            {pending.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setTable(tableFromCellRows(s.rows, true, '.', 'file'));
                  setPending(null);
                }}
                className="rounded border border-line px-2 py-1 text-xs hover:bg-accent-weak"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
