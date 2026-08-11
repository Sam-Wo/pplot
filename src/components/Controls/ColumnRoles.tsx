import { useStore } from '../../state/store';
import { numericColumns, textColumns } from '../../data/mapping';
import { isImplemented } from '../../plots';
import type { PlotType } from '../../data/types';
import { Field, Select } from '../ui';

const COLUMN_SHAPE: PlotType[] = ['bar', 'dot', 'box', 'violin', 'histogram', 'raincloud', 'paired'];
const XY_SHAPE: PlotType[] = ['scatter', 'line'];

// Role mapping UI (§5), shaped by plot type. Smart defaults come from the store;
// this lets the user reassign columns to slots.
export function ColumnRoles() {
  const table = useStore((s) => s.table);
  const plotType = useStore((s) => s.plotType);
  const mapping = useStore((s) => s.mapping);
  const setMapping = useStore((s) => s.setMapping);

  const nums = numericColumns(table);
  const texts = textColumns(table);

  if (table.columns.length === 0) {
    return <p className="text-xs text-ink-soft">Load data to assign columns.</p>;
  }
  if (!isImplemented(plotType)) {
    return <p className="text-xs text-ink-soft">Column roles appear once this plot is available.</p>;
  }

  // --- Column shape (bar / dot / box / violin) + heatmap value block ---
  if (COLUMN_SHAPE.includes(plotType) || plotType === 'heatmap') {
    const selected = mapping.value ?? nums.map((c) => c.name);
    const toggle = (name: string) =>
      setMapping({
        value: selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name],
      });
    const valueLabel =
      plotType === 'heatmap'
        ? 'Value columns (matrix)'
        : plotType === 'paired'
          ? 'Before / after (pick 2)'
          : 'Groups (value columns)';
    return (
      <div>
        <Field label={valueLabel}>
          <CheckList
            names={nums.map((c) => c.name)}
            selected={selected}
            onToggle={toggle}
            emptyMsg="No numeric columns."
          />
        </Field>
        {plotType === 'heatmap' && (
          <Field label="Row labels">
            <Select
              value={mapping.label ?? ''}
              onChange={(e) => setMapping({ label: e.target.value || undefined })}
            >
              <option value="">Row number</option>
              {texts.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    );
  }

  // --- Grouped bar (two-way tidy) ---
  if (plotType === 'groupedBar') {
    return (
      <div>
        <Field label="Category (x)">
          <ColSelect value={mapping.x} onChange={(v) => setMapping({ x: v })} names={texts.map((c) => c.name)} />
        </Field>
        <Field label="Group">
          <ColSelect value={mapping.group} onChange={(v) => setMapping({ group: v })} names={texts.map((c) => c.name)} />
        </Field>
        <Field label="Value">
          <ColSelect
            value={mapping.value?.[0]}
            onChange={(v) => setMapping({ value: v ? [v] : [] })}
            names={nums.map((c) => c.name)}
          />
        </Field>
      </div>
    );
  }

  // --- XY (scatter / line) ---
  if (XY_SHAPE.includes(plotType)) {
    const ys = mapping.y ?? [];
    const toggleY = (name: string) =>
      setMapping({ y: ys.includes(name) ? ys.filter((n) => n !== name) : [...ys, name] });
    return (
      <div>
        <Field label="X">
          <ColSelect
            value={mapping.x}
            onChange={(v) => setMapping({ x: v })}
            names={table.columns.map((c) => c.name)}
          />
        </Field>
        <Field label="Y (one or more)">
          <CheckList
            names={nums.map((c) => c.name)}
            selected={ys}
            onToggle={toggleY}
            emptyMsg="No numeric columns."
          />
        </Field>
        <Field label={`Colour by${ys.length > 1 ? ' (single Y only)' : ''}`}>
          <Select
            value={mapping.group ?? ''}
            onChange={(e) => setMapping({ group: e.target.value || undefined })}
            disabled={ys.length > 1}
          >
            <option value="">None</option>
            {texts.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    );
  }

  // --- Volcano ---
  if (plotType === 'volcano') {
    return (
      <div>
        <Field label="log₂ fold-change">
          <ColSelect value={mapping.log2fc} onChange={(v) => setMapping({ log2fc: v })} names={nums.map((c) => c.name)} />
        </Field>
        <Field label="p-value">
          <ColSelect value={mapping.pvalue} onChange={(v) => setMapping({ pvalue: v })} names={nums.map((c) => c.name)} />
        </Field>
        <Field label="Point labels">
          <ColSelect value={mapping.label} onChange={(v) => setMapping({ label: v })} names={texts.map((c) => c.name)} />
        </Field>
      </div>
    );
  }

  return null;
}

function CheckList({
  names,
  selected,
  onToggle,
  emptyMsg,
}: {
  names: string[];
  selected: string[];
  onToggle: (n: string) => void;
  emptyMsg: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded border border-line bg-surface p-1.5">
      {names.length === 0 && <span className="px-1 text-xs text-ink-soft">{emptyMsg}</span>}
      {names.map((n) => (
        <label key={n} className="flex cursor-pointer items-center gap-2 px-1 py-0.5 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(n)}
            onChange={() => onToggle(n)}
            className="accent-accent"
          />
          <span className="font-data text-xs text-ink">{n}</span>
        </label>
      ))}
    </div>
  );
}

function ColSelect({
  value,
  onChange,
  names,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  names: string[];
}) {
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">—</option>
      {names.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}
