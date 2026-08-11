import * as XLSX from 'xlsx';
import type { Cell, Column, ColumnType, Table, TableSource } from './types';

// Import + parsing (Appendix B). Forgiving of the messy spreadsheets people
// actually have: European decimal commas, semicolon CSVs, stray blank rows.

export type DelimiterOpt = 'auto' | 'tab' | 'comma' | 'semicolon';
export type DecimalOpt = 'auto' | 'period' | 'comma';

export interface DelimitedOptions {
  delimiter: DelimiterOpt;
  decimal: DecimalOpt;
  header: boolean;
}

export const defaultDelimitedOptions: DelimitedOptions = {
  delimiter: 'auto',
  decimal: 'auto',
  header: true,
};

const DELIM_CHAR: Record<Exclude<DelimiterOpt, 'auto'>, '\t' | ',' | ';'> = {
  tab: '\t',
  comma: ',',
  semicolon: ';',
};

// --- Detection (Appendix B) -------------------------------------------------

export function detectDelimiter(text: string): '\t' | ',' | ';' {
  if (text.includes('\t')) return '\t'; // Excel copy uses tab
  const line = text.split(/\r?\n/).find((l) => l.trim()) ?? '';
  return line.split(';').length > line.split(',').length ? ';' : ',';
}

export function detectDecimal(text: string, delim: string): '.' | ',' {
  return delim === ';' && /\d,\d/.test(text) ? ',' : '.'; // European: ; + , decimals
}

export function toNumber(raw: string, decimal: '.' | ','): number {
  const t = raw.trim();
  if (t === '') return NaN;
  const s = decimal === ',' ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function resolveDelimiter(text: string, opt: DelimiterOpt): '\t' | ',' | ';' {
  return opt === 'auto' ? detectDelimiter(text) : DELIM_CHAR[opt];
}

export function resolveDecimal(text: string, delim: string, opt: DecimalOpt): '.' | ',' {
  if (opt === 'auto') return detectDecimal(text, delim);
  return opt === 'comma' ? ',' : '.';
}

// --- Tokenizing -------------------------------------------------------------

// Quote-aware splitter: respects "double quotes", embedded delimiters, escaped
// "" quotes, and newlines inside quoted fields.
function parseRows(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) pushField();
    else if (c === '\n') pushRow();
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length > 0) pushRow();
  return rows;
}

// --- Column typing (§5: ≥60% of non-empty cells parse as finite numbers) ----

function looksNumeric(c: Cell, decimal: '.' | ','): boolean {
  if (c === null) return false;
  if (typeof c === 'number') return Number.isFinite(c);
  return Number.isFinite(toNumber(String(c), decimal));
}

function coerceNumeric(c: Cell, decimal: '.' | ','): number | null {
  if (c === null) return null;
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  const n = toNumber(String(c), decimal);
  return Number.isFinite(n) ? n : null;
}

function isBlank(c: Cell): boolean {
  return c === null || c === undefined || String(c).trim() === '';
}

function buildColumn(name: string, cells: Cell[], decimal: '.' | ','): Column {
  const nonEmpty = cells.filter((c) => !isBlank(c));
  const numericCount = nonEmpty.filter((c) => looksNumeric(c, decimal)).length;
  const isNumeric = nonEmpty.length > 0 && numericCount / nonEmpty.length >= 0.6;
  const type: ColumnType = isNumeric ? 'numeric' : 'text';
  const values: Cell[] = cells.map((c) => {
    if (isBlank(c)) return null;
    return type === 'numeric' ? coerceNumeric(c, decimal) : String(c);
  });
  return { name, type, values };
}

export function emptyTable(source: TableSource = 'manual'): Table {
  return { columns: [], nRows: 0, source };
}

// Recompute a column's type + coercion from raw cell contents (used by grid
// edits, which arrive as strings). Decimal is '.' — grid edits are canonical.
export function retypeColumn(name: string, cells: Cell[]): Column {
  return buildColumn(name, cells, '.');
}

// Build a Table from a rectangular block of cells. Drops fully-blank rows and
// backfills a "Column N" name for empty headers.
export function tableFromCellRows(
  rows: Cell[][],
  header: boolean,
  decimal: '.' | ',',
  source: TableSource
): Table {
  const clean = rows.filter((r) => r.some((c) => !isBlank(c)));
  if (clean.length === 0) return emptyTable(source);
  const ncol = Math.max(...clean.map((r) => r.length));
  const headerRow = header ? clean[0] : null;
  const body = header ? clean.slice(1) : clean;
  const columns: Column[] = [];
  for (let c = 0; c < ncol; c++) {
    const rawName = headerRow?.[c] != null ? String(headerRow[c]).trim() : '';
    const name = rawName || `Column ${c + 1}`;
    columns.push(
      buildColumn(
        name,
        body.map((r) => (r[c] ?? null) as Cell),
        decimal
      )
    );
  }
  return { columns, nRows: body.length, source };
}

// --- Public entry points ----------------------------------------------------

export function parseDelimited(
  text: string,
  opts: DelimitedOptions,
  source: TableSource = 'paste'
): Table {
  const delim = resolveDelimiter(text, opts.delimiter);
  const decimal = resolveDecimal(text, delim, opts.decimal);
  const rows = parseRows(text, delim) as Cell[][];
  return tableFromCellRows(rows, opts.header, decimal, source);
}

// First N physical lines, for the paste panel's live preview (cheap on every
// keystroke — we never parse the whole paste until Load).
export function previewText(text: string, maxLines = 12): string {
  return text.split(/\r?\n/).slice(0, maxLines).join('\n');
}

export type LoadedFile =
  | { type: 'text'; text: string }
  | { type: 'workbook'; sheets: { name: string; rows: Cell[][] }[] };

// Read a dropped/picked file. CSV/TSV/TXT route through the delimited pipeline
// (so European decimals are handled like paste); xlsx/xls go through SheetJS,
// where numbers are already stored as numbers (locale-independent).
export async function loadFile(file: File): Promise<LoadedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    return { type: 'text', text: await file.text() };
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheets = wb.SheetNames.map((sn) => ({
    name: sn,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[sn], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as Cell[][],
  }));
  return { type: 'workbook', sheets };
}
