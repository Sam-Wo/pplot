import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import {
  parseDelimited,
  previewText,
  resolveDecimal,
  resolveDelimiter,
} from '../../data/parse';
import type { DecimalOpt, DelimiterOpt } from '../../data/parse';
import type { Table } from '../../data/types';
import { Button, Segmented, Toggle } from '../ui';

// Paste panel (§6a). A dedicated, previewable panel — never load silently. The
// live preview re-parses the first rows on every keystroke/setting change so the
// user sees the result before committing.
export function PasteModal({
  open,
  initialText,
  onClose,
}: {
  open: boolean;
  initialText: string;
  onClose: () => void;
}) {
  const setTable = useStore((s) => s.setTable);
  const [text, setText] = useState('');
  const [delimiter, setDelimiter] = useState<DelimiterOpt>('auto');
  const [decimal, setDecimal] = useState<DecimalOpt>('auto');
  const [header, setHeader] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setDelimiter('auto');
      setDecimal('auto');
      setHeader(true);
      // Autofocus after mount.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open, initialText]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const preview = useMemo<Table>(
    () => parseDelimited(previewText(text, 12), { delimiter, decimal, header }, 'paste'),
    [text, delimiter, decimal, header]
  );

  // Show the user what auto-detection resolved to.
  const resolved = useMemo(() => {
    const d = resolveDelimiter(text, delimiter);
    return {
      delim: d === '\t' ? 'Tab' : d === ';' ? 'Semicolon' : 'Comma',
      dec: resolveDecimal(text, d, decimal) === ',' ? 'Comma' : 'Period',
    };
  }, [text, delimiter, decimal]);

  if (!open) return null;

  const onLoad = () => {
    const table = parseDelimited(text, { delimiter, decimal, header }, 'paste');
    if (table.nRows > 0 || table.columns.length > 0) setTable(table);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Paste data</h2>
          <p className="text-xs text-ink-soft">Copy a range from Excel or Sheets and paste below.</p>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Group A\tGroup B\n4.2\t6.1\n3.8\t5.8'}
            spellCheck={false}
            className="h-36 w-full resize-y rounded border border-line bg-bg p-3 font-data text-sm text-ink outline-none focus:border-accent"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                Delimiter {delimiter === 'auto' && <span className="text-ink-soft">· {resolved.delim}</span>}
              </span>
              <Segmented<DelimiterOpt>
                value={delimiter}
                onChange={setDelimiter}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'tab', label: 'Tab' },
                  { value: 'comma', label: 'Comma' },
                  { value: 'semicolon', label: 'Semicolon' },
                ]}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                Decimal {decimal === 'auto' && <span className="text-ink-soft">· {resolved.dec}</span>}
              </span>
              <Segmented<DecimalOpt>
                value={decimal}
                onChange={setDecimal}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'period', label: 'Period' },
                  { value: 'comma', label: 'Comma' },
                ]}
              />
            </div>
          </div>

          <div className="mt-3 max-w-[16rem]">
            <Toggle checked={header} onChange={setHeader} label="First row is header" />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-ink-soft">Preview</p>
            <PreviewTable table={preview} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onLoad} disabled={preview.columns.length === 0}>
            Load
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewTable({ table }: { table: Table }) {
  if (table.columns.length === 0) {
    return (
      <div className="rounded border border-dashed border-line-strong px-3 py-6 text-center text-xs text-ink-soft">
        Nothing to preview yet.
      </div>
    );
  }
  const rows = Math.min(table.nRows, 8);
  return (
    <div className="overflow-auto rounded border border-line">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-bg">
            {table.columns.map((c) => (
              <th key={c.name} className="border-b border-line px-2 py-1.5 align-bottom">
                <span className="block font-data text-xs font-semibold text-ink">{c.name}</span>
                <span className="block font-data text-[10px] uppercase tracking-wide text-ink-soft">
                  {c.type}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} className="odd:bg-surface even:bg-bg">
              {table.columns.map((c) => (
                <td key={c.name} className="border-b border-line px-2 py-1 font-data text-xs text-ink">
                  {c.values[r] === null || c.values[r] === undefined ? '' : String(c.values[r])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
