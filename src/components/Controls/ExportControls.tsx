import { useState } from 'react';
import { useStore } from '../../state/store';
import { isImplemented } from '../../plots';
import { usePlotElement } from '../PlotCanvas/context';
import {
  clipboardSupported,
  copyPngToClipboard,
  downloadFigure,
  slideSizes,
} from '../../export/image';
import type { SlideSize } from '../../export/image';
import { Button, Field, Segmented, Select, Toggle } from '../ui';

// Export (§9). PowerPoint-first: PNG at 1–3×, transparent WYSIWYG, SVG, slide
// sizes, and one-click copy-to-clipboard (guarded for browsers that block it).
export function ExportControls() {
  const ref = usePlotElement();
  const plotType = useStore((s) => s.plotType);
  const table = useStore((s) => s.table);
  const transparent = useStore((s) => s.options.transparent);
  const setOptions = useStore((s) => s.setOptions);

  const [size, setSize] = useState<SlideSize>('wide');
  const [scale, setScale] = useState(2);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const canExport = isImplemented(plotType) && table.nRows > 0;
  const clip = clipboardSupported();

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg(null), 2500);
  };

  const gd = () => ref.current;

  const png = async () => {
    const el = gd();
    if (!el) return;
    try {
      await downloadFigure(el, { format: 'png', size, scale });
    } catch {
      flash('err', 'PNG export failed.');
    }
  };

  const svg = async () => {
    const el = gd();
    if (!el) return;
    try {
      await downloadFigure(el, { format: 'svg', size, scale: 1 });
    } catch {
      flash('err', 'SVG export failed.');
    }
  };

  const copy = async () => {
    const el = gd();
    if (!el) return;
    try {
      await copyPngToClipboard(el, { size, scale });
      flash('ok', 'Copied — paste into a slide.');
    } catch {
      flash('err', 'Copy blocked by this browser.');
    }
  };

  return (
    <div>
      <div className="mb-2">
        <Toggle
          checked={transparent}
          onChange={(v) => setOptions({ transparent: v })}
          label="Transparent background"
        />
      </div>

      <Field label="Size">
        <Select value={size} onChange={(e) => setSize(e.target.value as SlideSize)}>
          {(Object.keys(slideSizes) as SlideSize[]).map((s) => (
            <option key={s} value={s}>
              {slideSizes[s].label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="PNG scale">
        <Segmented<string>
          value={String(scale)}
          onChange={(v) => setScale(Number(v))}
          options={[
            { value: '1', label: '1×' },
            { value: '2', label: '2×' },
            { value: '3', label: '3×' },
          ]}
        />
      </Field>

      <div className="mt-3 flex flex-col gap-2">
        <Button variant="primary" onClick={copy} disabled={!canExport || !clip} title={clip ? '' : 'Not supported in this browser'}>
          Copy to clipboard
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={png} disabled={!canExport}>
            Download PNG
          </Button>
          <Button onClick={svg} disabled={!canExport}>
            Download SVG
          </Button>
        </div>
      </div>

      {msg && (
        <p className={`mt-2 text-xs ${msg.kind === 'ok' ? 'text-accent' : 'text-red-600'}`}>
          {msg.text}
        </p>
      )}
      {!clip && (
        <p className="mt-2 text-[11px] text-ink-soft">
          Clipboard copy is unavailable here — use Download PNG instead.
        </p>
      )}
    </div>
  );
}
