# pplot — build specification

A lightweight, no-code plotting tool for scientists. Paste or drop tabular data, shape it, and export refined, interactive figures for slides — without touching R or Python.

> **Using this doc with Claude Code.** Drop it in the repo root. It is both the product spec and the kickoff brief. You can also keep a trimmed copy as `CLAUDE.md` for persistent project context. A working single-file prototype (`figure_studio_v0.html`) exists — use it as the reference implementation for the Phase 1 plot builders, the figure theme, and the stats helpers; this project reimplements those in a proper component structure and extends them.

---

## 1. What pplot is, and the principles that don't move

pplot is a browser app that gives non-programmers the plotting power of ggplot/Plotly through a GUI. It is modelled on the *workflow* of GraphPad Prism — typed data in a grid, guided plot choices, fine control over appearance — but is visualization-only (no full stats suite) and produces interactive, slide-ready figures.

Four principles are non-negotiable; every decision serves them:

1. **Fully client-side and standalone.** All parsing, plotting, and export happen in the browser. No server, no data upload. It must build to a static bundle that can be hosted on an internal URL / SharePoint, or wrapped in Tauri later for a double-click desktop app — same codebase.
2. **No-code, and forgiving of messy real data.** The user never sees code. The tool absorbs the spreadsheets people actually have (European decimal commas, semicolon CSVs, stray blank rows, wide or long layouts).
3. **Refined by default.** Out-of-the-box Plotly looks like a dashboard. pplot's figures must look intentional and publication-adjacent *before* the user changes anything. This is a deliberate, funded part of the work, not a coat of paint at the end.
4. **Interactive.** Hovering a figure highlights the value under the cursor and de-emphasizes the rest. This is the signature interaction (see §8).

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build / dev | **Vite + React + TypeScript** | Fast dev loop, component structure, and TS types for the data model (which is the crux — §5). |
| Plotting | **Plotly.js** (`plotly.js-dist-min`) via a thin imperative hook | Interactive, exports SVG/PNG, huge chart coverage. Imperative access (a `usePlotly` ref hook) gives full control over hover-highlight restyling. `react-plotly.js` is acceptable but wrap events yourself. |
| Spreadsheet import | **SheetJS** (`xlsx`, community build) | Reads xlsx/xls/csv; locale-independent for numbers stored as numbers. |
| Data grid | **Glide Data Grid** (`@glideapps/glide-data-grid`, MIT) | Canvas-based, spreadsheet feel, handles large data, paste/fill. Phase 1 may ship a simple controlled-input grid and swap Glide in at Phase 2. |
| State | **Zustand** | Minimal boilerplate; one store for table + mapping + options. Swap for context if preferred. |
| Styling | **Tailwind** + a small CSS-variable token layer (§10) | Utilities for layout, tokens for the identity. |
| Stats helpers | **jStat** (or a tiny inverse-t) | For t-based 95% CI. Everything else is hand-rolled (§ Appendix C). |

**Licensing note (real procurement concern):** Glide Data Grid and AG Grid *Community* are MIT; **Handsontable is not free for commercial use** and AG Grid's Prism-like range/fill features are Enterprise. Stay on Glide.

Output is a static build (`vite build` → `dist/`). No backend, no environment variables, no network calls at runtime except the optional (user-triggered) nothing — the app works offline.

---

## 3. Project structure

```
pplot/
  index.html
  package.json  vite.config.ts  tailwind.config.js  tsconfig.json
  src/
    main.tsx
    App.tsx
    theme/
      tokens.css          # CSS custom properties (§10)
      palettes.ts         # qualitative / sequential / diverging palettes
      plotlyTheme.ts      # baseLayout(): the figure theme
    state/
      store.ts            # Zustand: table, mapping, plotType, options
    data/
      types.ts            # Table, Column, Mapping, PlotOptions (§5, App. D)
      parse.ts            # xlsx + delimited + decimal/delimiter detection (App. B)
      mapping.ts          # auto-detect roles; wide/long/matrix adapters
      examples.ts         # a few built-in datasets, one per shape
    components/
      Layout/            Sidebar.tsx  Header.tsx
      DataPanel/         ImportButton.tsx  PasteModal.tsx  Grid.tsx  ExampleMenu.tsx
      Controls/          PlotTypePicker.tsx  ColumnRoles.tsx  StyleControls.tsx  ExportControls.tsx
      PlotCanvas/        Plot.tsx  usePlotly.ts  hover.ts
    plots/               # each: (table, mapping, opts) => { traces, layout }
      index.ts  bar.ts  groupedBar.ts  dot.ts  box.ts  violin.ts  raincloud.ts
      scatter.ts  line.ts  heatmap.ts  histogram.ts  volcano.ts  paired.ts
    export/              image.ts (png/svg/clipboard)  project.ts (save/load JSON)
    lib/                 stats.ts  jitter.ts  cluster.ts
```

**Core builder contract:** every file in `plots/` exports a pure function
`build(table: Table, mapping: Mapping, opts: PlotOptions): { traces: Plotly.Data[]; layout: Partial<Plotly.Layout> }`.
Keep them pure and independently testable.

---

## 4. Data flow

```
File (xlsx/csv)  ─┐
Paste range       ├─▶ parse.ts ─▶ Table (in store) ─▶ Grid (editable)
Example dataset  ─┘                       │
Manual edits ◀────────────────────────────┘
                                          ▼
                       Mapping (roles per plot) ──▶ plots/<type>.build() ──▶ Plotly.react()
                                                                                 │
                                                     export/image.ts ◀───────────┘
```

---

## 5. The data model (the crux)

Most of pplot's value and most of the effort live here — not in the plotting. Prism feels good because its *typed tables* encode structure (what's a replicate, what's a group, what's an X). Reproduce that abstraction.

**Internal representation** — keep it simple and typed:

```ts
type ColumnType = 'numeric' | 'text';
interface Column { name: string; type: ColumnType; values: (number | string | null)[]; }
interface Table  { columns: Column[]; nRows: number; source: 'file'|'paste'|'example'|'manual'; }
```

**Dataset shapes** the tool understands (auto-detect a default, let the user override via the role UI):

| Shape | Layout | Drives |
|---|---|---|
| **Column** (wide) | each numeric column = a group/condition; rows = replicates | bar, dot, box, violin, raincloud |
| **Grouped / two-way** | a category column + a group column + a value column | grouped bar, grouped box/violin |
| **XY** | one X column + one or more Y columns | scatter (+ trendline), line/time-course |
| **Matrix** | numeric columns + optional text label column | heatmap (± normalize, ± cluster) |
| **Long / tidy** | category + value (+ optional group/facet) | flexible superset; can feed most plots |
| **Volcano** | log2FC column + p-value column (+ label) | volcano (a specialization of XY) |

**Role mapping** connects columns to plot slots. Provide smart defaults (e.g. all numeric columns → `value`; first text column → `label`) and a compact UI to reassign:

```ts
interface Mapping {
  value?: string[];   // numeric columns as groups/series (Column shape)
  x?: string; y?: string[];
  group?: string;     // categorical color/subgroup
  facet?: string;     // small multiples (stretch)
  label?: string;     // heatmap row labels / point labels
  log2fc?: string; pvalue?: string;   // volcano
}
```

Auto-detection (`mapping.ts`): a column is `numeric` if ≥60% of non-empty cells parse as finite numbers. Choose a default shape from the mix of numeric/text columns. Never block on ambiguity — pick a sane default and let the user correct it.

---

## 6. Data input

### 6a. Paste panel (new requirement — build a real one)
Replace the prototype's silent "paste anywhere" with a dedicated, previewable panel.

- A **"Paste data"** button in the Data section opens a modal.
- Contents: short instruction ("Copy a range from Excel or Sheets and paste below"), a large **monospace textarea** (autofocus), and settings:
  - **Delimiter:** Auto / Tab / Comma / Semicolon.
  - **Decimal separator:** Auto / Period / Comma. *(European Excel — likely for a Basel user — often uses `;` delimiter and `,` decimals. Handle it; see Appendix B.)*
  - **First row is header** (default on).
- A **live preview grid** re-parses the first ~8 rows on every keystroke/setting change so the user sees the result before committing.
- **Cancel / Load.** Load parses fully, sets the Table, and closes.
- Keep a global Ctrl/Cmd-V shortcut, but route it *into the panel's preview* — never load silently.

### 6b. File import
Drag-drop zone + file picker for `.xlsx/.xls/.csv/.tsv` (SheetJS). If a workbook has multiple sheets, let the user pick which sheet. Same decimal/delimiter handling as paste for CSVs.

### 6c. Editable grid
After load, data is editable in the grid (Glide, or a simple grid in Phase 1). Add row / add column / clear. Header cells are editable and become axis labels / role options. Edits flow back into the Table (debounced) and trigger a redraw.

### 6d. Examples
Ship a few built-in datasets, one per shape (Column: a treatment × replicate table; XY: a dose–response; Matrix: a marker-expression matrix; Volcano: a small DE table). Label them clearly as synthetic. Load one on first run so the canvas is never empty.

---

## 7. Plot types

**Architectural rule that makes everything else easy: build each group/series as its own Plotly trace.** This makes legends clean, per-group hover templates natural, and hover-highlight a one-line restyle (§8). Group two-way data by the `group` column into separate traces; overlay individual points as their own trace(s).

| Plot | Shape | Key options | Phase |
|---|---|---|---|
| Bar (mean) + points + error | Column | error = SD/SEM/95%CI/none; show points | 1 |
| Dot / strip (jitter) + mean crossbar | Column | error; median vs mean | 1 |
| Heatmap | Matrix | row z-score; colorscale (seq/diverging); clustering (P3) | 1 |
| Box plot (± points) | Column / two-way | notched; show points; group | 2 |
| Violin (± box, ± points; half-violin) | Column / two-way | bandwidth; side | 2 |
| Grouped / clustered bar | Two-way | stacked vs grouped | 2 |
| Scatter (XY) | XY | trendline none/linear/LOESS + R²/eqn; error bars; color by group | 2 |
| Line / time-course | XY / long | mean ± error ribbon; markers; unified hover | 2 |
| Raincloud (half-violin + box + points) | Column | Goedhart-style; orientation | 3 |
| Volcano | Volcano | FC & p thresholds; highlight + label significant; click-to-label | 3 |
| Histogram / density | Column | bins; overlay density; normalize | 3 |
| Paired / before-after | Two conditions | connecting lines; color by direction | 3 |
| *(stretch)* Kaplan–Meier + risk table | time-to-event + censor | step curve; CI band | 3+ |

Deterministic jitter (seed from indices) so points don't jump on every redraw — see `lib/jitter.ts` and the v0.

---

## 8. Interactivity (signature feature)

Two layers: rich tooltips, and highlight-on-hover.

**Rich tooltips** — per plot, show the meaningful values, not raw coordinates:
- Bar → group, mean, ± error, n. Point → exact value + group/replicate.
- Box/violin → median, Q1/Q3, IQR, whiskers, n.
- Heatmap cell → row label · column · value (and z-score when normalized).
- Scatter → label, x, y (+ residual if a trendline is on).
- Line → series · x · y.

**Highlight-on-hover** (the "highlight values" ask):
- **Series/group emphasis:** on `plotly_hover`, set the hovered trace to full opacity and dim the others (~0.2); restore on `plotly_unhover`. Trivial because each group is its own trace (§7). See Appendix A.
- **Heatmap crosshair:** on hover, draw a faint band over the hovered row and column via `relayout({shapes})`, and emphasize the cell; clear on unhover.
- **Scatter category:** hovering one point (or a legend entry) highlights all points sharing its group.
- **Bar ↔ points link:** hovering a bar emphasizes its overlaid points and vice versa.

**Other niceties:** spike lines / crosshair on XY (`spikemode`); a `hovermode` toggle (`closest` vs `x unified` for time-courses); legend-hover highlighting. **Stretch:** click-to-pin a label (great for volcano — click a point to label the gene).

Put the hover logic in `PlotCanvas/hover.ts`, attached by `usePlotly` after each `Plotly.react`. Re-attach on data change; detach on unmount.

---

## 9. Export (PowerPoint-first)

Figures go to slides, not journals, so raster is the workhorse and vector is a bonus:

- **PNG at 1× / 2× / 3× scale** (default 2×) — crisp when projected. `Plotly.downloadImage`.
- **Transparent background toggle** — WYSIWYG (affects preview and export) so figures sit on any slide theme.
- **SVG** — PowerPoint imports it and "Convert to Shape" lets users ungroup/recolor inside PPT.
- **Copy to clipboard** (PNG) — one click to paste straight into a slide. Render to canvas → `ClipboardItem`. High-value UX; guard for browsers/iframes that block it.
- **Slide-shaped size presets:** 16:9 (1600×900), square (1100×1100), half-slide (1100×800). Aspect matters more than DPI here.

**Project save/load (Phase 2):** serialize `{ table, mapping, plotType, options }` to a `.pplot.json` and reload it identically. This gives reproducibility (a figure's exact inputs and settings travel with it) and echoes Prism's project files.

---

## 10. Design system ("better look")

**Direction:** a precise, quiet scientific instrument — not a dashboard, not a marketing page. Restraint everywhere except the one signature moment (the hover-highlight). Deliberately avoids the current AI-design clichés (no cream+serif+terracotta, no near-black+acid-green, no broadsheet hairlines).

**UI tokens** (`theme/tokens.css`):
```
--bg:#F6F8FA;  --surface:#FFFFFF;  --ink:#141A22;  --ink-soft:#5C6675;
--line:#E2E7ED;  --line-strong:#CDD5DE;
--accent:#0E7C74;  --accent-hover:#0B655E;  --accent-weak:#E7F3F2;   /* deep petrol/teal */
--radius:8px;
```
Cool near-white canvas, graphite ink, one considered petrol accent for interactive state.

**Type — the signature pairing:** a clean sans for chrome + a **monospace for anything that represents data or a measurement** (column headers, stat readouts, numeric inputs, the paste textarea). This "instrument readout" treatment is the identity. In a bundled Vite project you can ship real fonts: **Inter** (UI) + **JetBrains Mono** or **IBM Plex Mono** (data). Type scale with intentional weights; sentence case; plain, active-voice copy ("Download figure", not "Export"). Empty and error states give direction, not mood.

**Figure theme** (`theme/plotlyTheme.ts`) — separate from UI chrome; figures must stay portable:
- Font **Arial/Helvetica** (universal, journal/slide-safe), larger than screen defaults (base ~16) because slide figures are read from a distance.
- No vertical gridlines; very light horizontal gridlines (`#ECECEC`) or none. Solid axis lines `#333`, outside ticks. No zero-line clutter.
- Sensible margins; left-aligned title.
- Qualitative palette default **Okabe–Ito** (colorblind-safe): `#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #666666`. Alternatives: Paul Tol bright / muted, grayscale.
- Sequential (heatmap raw): Viridis / Cividis. Diverging (z-score): blue–white–red `[#2166AC, #F7F7F7, #B2182B]` with `zmid:0`.

**Layout:** header (brand + synthetic-data note) → left control rail (Data · Plot · Columns · Style · Export) → main = plot card on top, editable grid below. Active plot type carries an accent left-border (encodes state truthfully; don't use decorative 01/02/03 numbering — there's no sequence). Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected. Keep motion subtle (hover/active transitions only).

---

## 11. Build roadmap

**Phase 1 — Foundation + port.**
Scaffold (Vite/React/TS/Tailwind/Zustand) · `usePlotly` hook · file import + editable grid + examples · **paste panel with delimiter/decimal detection and live preview** · plots: bar+points+error, dot, heatmap, on the refined theme · interactivity: rich tooltips + series-dim highlight + heatmap crosshair · export: PNG 1–3×, SVG, transparent toggle, slide sizes, copy-to-clipboard.
*Done when:* you can load/paste/edit data; render all three plots; hovering highlights the right thing; and a transparent 2× PNG pastes cleanly into a slide.

**Phase 2 — Breadth + reproducibility.**
Plots: box, violin, grouped bar, scatter (+linear/LOESS trendline + R²), line/time-course (unified hover) · generalized role-mapping UI + shape auto-detection · t-based 95% CI and median/quartile summaries · project save/load JSON · swap in Glide Data Grid.
*Done when:* every Phase-2 plot renders with correct hover + highlight, and saving then reopening a project reproduces the figure exactly.

**Phase 3 — Advanced / biotech.**
Plots: raincloud, volcano (thresholds, highlight + label significant, click-to-label), histogram/density, paired/before-after · heatmap hierarchical clustering + optional dendrograms (stretch) · display-only significance brackets/stars (stretch).
*Stretch beyond:* Kaplan–Meier + risk table; faceting/small multiples; **Tauri desktop build**.
*Done when:* volcano is usable on a real differential-expression table and raincloud matches the expected transparent-data-display style.

---

## 12. Non-goals

Not a statistics package (no test-selection engine; significance annotations are display-only in v1). No backend, accounts, or realtime collaboration. No press-ready CMYK/EPS pipeline — screen + slide raster/SVG only. Keep the surface area small; depth over breadth of settings.

---

## Appendix A — hover-highlight pattern

```ts
// PlotCanvas/hover.ts — attach after each Plotly.react(gd, ...)
export function attachHoverHighlight(gd: any) {
  const full = gd.data.map(() => 1);
  const dim  = gd.data.map(() => 0.2);
  gd.on('plotly_hover', (e: any) => {
    const c = e.points[0].curveNumber;
    const op = gd.data.map((_: any, i: number) => (i === c ? 1 : 0.2));
    Plotly.restyle(gd, { opacity: op });            // trace-level (each group = a trace)
  });
  gd.on('plotly_unhover', () => Plotly.restyle(gd, { opacity: full }));
}

// Heatmap crosshair: on hover, band the hovered row/column.
function heatmapCrosshair(gd: any) {
  gd.on('plotly_hover', (e: any) => {
    const { x, y } = e.points[0];
    Plotly.relayout(gd, { shapes: [
      { type:'rect', xref:'x', yref:'paper', x0:x, x1:x, y0:0, y1:1, line:{width:0}, fillcolor:'rgba(14,124,116,0.12)' },
      { type:'rect', xref:'paper', yref:'y', x0:0, x1:1, y0:y, y1:y, line:{width:0}, fillcolor:'rgba(14,124,116,0.12)' },
    ]});
  });
  gd.on('plotly_unhover', () => Plotly.relayout(gd, { shapes: [] }));
}
```
For single-trace scatter where you want *point-level* highlight, use `selectedpoints` + `selected`/`unselected` marker styles instead of trace opacity.

## Appendix B — delimiter & decimal detection

```ts
function detectDelimiter(text: string): '\t'|','|';' {
  if (text.includes('\t')) return '\t';                        // Excel copy uses tab
  const line = text.split(/\r?\n/).find(l => l.trim()) ?? '';
  return (line.split(';').length > line.split(',').length) ? ';' : ',';
}
function detectDecimal(text: string, delim: string): '.'|',' {
  return (delim === ';' && /\d,\d/.test(text)) ? ',' : '.';    // European: ; delimiter + , decimals
}
function toNumber(raw: string, decimal: '.'|','): number {
  const s = decimal === ',' ? raw.trim().replace(/\./g,'').replace(',', '.') : raw.trim();
  const n = Number(s); return Number.isFinite(n) ? n : NaN;
}
```

## Appendix C — summary stats

```ts
import { studentt } from 'jstat';
export function summarize(vals: number[]) {
  const a = vals.filter(Number.isFinite); const n = a.length;
  const mean = n ? a.reduce((s,x)=>s+x,0)/n : NaN;
  const sd   = n>1 ? Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/(n-1)) : 0;
  const sem  = n>1 ? sd/Math.sqrt(n) : 0;
  const ci95 = n>1 ? studentt.inv(0.975, n-1) * sem : 0;
  return { n, mean, sd, sem, ci95 };
}
```

## Appendix D — reference

The single-file prototype `figure_studio_v0.html` implements Phase 1's three builders, the figure theme, deterministic jitter, and the export logic in vanilla JS. Port its logic into `plots/`, `theme/`, and `export/`; do not carry over its global paste listener (replaced by the paste panel, §6a) or its hand-rolled grid (replaced per §6c).
