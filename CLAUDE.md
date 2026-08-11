# pplot — project context

A lightweight, **no-code, fully client-side** plotting tool for scientists. Paste or drop tabular
data, shape it with a Prism-like typed-table model, and export refined, interactive figures for
slides. Full product spec: [`pplot-spec.md`](./pplot-spec.md).

## Non-negotiable principles
1. **Fully client-side & standalone** — all parse/plot/export in the browser, no server, no data
   upload. Builds to a static `dist/`. Works offline (fonts are bundled locally).
2. **No-code & forgiving of messy data** — absorbs semicolon CSVs, European decimal commas, stray
   blank rows, wide/long layouts.
3. **Refined by default** — figures look intentional before the user changes anything (see
   `theme/plotlyTheme.ts`).
4. **Interactive** — hover highlights the value under the cursor and de-emphasizes the rest.

## Stack
Vite + React + TypeScript · Plotly.js (`plotly.js-dist-min`) via an imperative `usePlotly` hook ·
SheetJS (`xlsx`) for import · Zustand store · Tailwind + a CSS-variable token layer.

## Structure & the core contract
See `src/` layout in the spec (§3). **Every file in `src/plots/` is a pure function**
`build(table, mapping, opts) => { traces, layout }`, registered in `plots/index.ts`. Keep them pure
and testable — no DOM, no store access.

Data flows: input (`data/parse.ts`) → `Table` in `state/store.ts` → `Mapping` (`data/mapping.ts`)
→ `plots/<type>.build()` → `Plotly.react()` (`PlotCanvas/usePlotly.ts`) → export (`export/image.ts`).

## Conventions
- **Each group/series is its own Plotly trace**, tagged with `meta: <groupName>`. Hover-highlight
  then emphasizes traces sharing the hovered `meta` and dims the rest — this also gives the
  bar↔points link for free. See `PlotCanvas/hover.ts`.
- **Deterministic jitter** (`lib/jitter.ts`), seeded from indices, so points don't jump on redraw.
- UI chrome uses Inter; **anything representing data/measurement uses the mono "data" treatment**
  (`.font-data`, JetBrains Mono). Figure theme (Arial) is separate so figures stay portable.
- Column typing rule: a column is `numeric` if ≥60% of non-empty cells parse as finite numbers.

## Status
**Phase 1 complete & browser-verified:** scaffold, paste panel (delimiter/decimal detection + live
preview), file import + editable grid + examples, plots (bar+points+error, dot, heatmap) on the
refined theme, rich tooltips + series-dim highlight + heatmap crosshair, export (PNG 1–3×, SVG,
transparent WYSIWYG, slide sizes, copy-to-clipboard).

**Phase 2 complete & browser-verified:** box, violin (± half), grouped/stacked bar, scatter
(linear + LOESS trendline with R²/residuals + spikelines), line/time-course (± SD ribbon, unified
hover); generalized role UI + shape auto-detection (Column / two-way / XY); t-based 95% CI and
median/quartile summaries wired in; project **save/load** to `.pplot.json` (`export/project.ts`,
`state/store.ts` `loadProject`). LOESS/linear fit live in `lib/regression.ts`.

Phase 3 (raincloud, volcano, histogram, paired; display-only significance brackets) is listed but
not built; the plot picker shows those disabled with their phase.

### Deliberate deviations from the spec
- **Simple controlled grid** still in place; Glide Data Grid swap-in is deferred (spec §2 permits a
  Phase-1 simple grid; the swap is the one remaining Phase-2 line item).
- **Hand-rolled inverse-t** in `lib/stats.ts` instead of jStat — one fewer dependency to vet
  (spec Appendix C allows either).
- The reference prototype `figure_studio_v0.html` was **not present** in the repo; the build has
  followed the spec directly.
- Examples ship one per shape; loading an example whose suggested plot is Phase 3 (volcano) shows a
  roadmap placeholder until that builder lands.

## Commands
```
npm run dev        # dev server
npm run build      # tsc + vite build → dist/
npm run typecheck  # tsc, no emit
```
