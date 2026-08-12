# pplot

A lightweight, no-code plotting tool for scientists. Paste or drop tabular data, shape it, and
export refined, interactive figures for slides — without touching R or Python. Runs entirely in the
browser: no server, no data upload, works offline.

![status](https://img.shields.io/badge/phases%201–3-complete-0E7C74)

## Quick start

```bash
npm install
npm run dev       # open the printed localhost URL
```

An example dataset loads on first run, so the canvas is never empty.

## What works today (Phases 1–2)

- **Data in** — load built-in examples, drag/drop or pick `.xlsx/.xls/.csv/.tsv`, or use the
  **Paste** panel. Paste auto-detects delimiter (tab/comma/semicolon) and decimal separator
  (period/comma — handles European `1.234,5`), with a live preview before you commit. Data is then
  editable in a spreadsheet-style grid. Shape (Column / two-way / XY / matrix) is auto-detected and
  reassignable via the column-role UI.
- **Plots** — bar, dot/strip, heatmap (± z-score), box, violin (± half), grouped/stacked bar,
  scatter (linear + LOESS trendline with R²), line/time-course (± SD ribbon), **dose–response with
  4PL/3PL IC50 fitting**, volcano (thresholds + gene labels + click-to-pin), histogram/density (KDE
  overlay), raincloud, and paired/before-after — all on a refined, slide-ready theme with the
  colorblind-safe Okabe–Ito palette.
- **Curve fitting & axes** — sigmoidal dose–response curves fit a Hill equation (Levenberg–Marquardt)
  and report IC50/EC50, Hill slope, and R²; XY plots switch between **linear / log₁₀ / log₂** axes.
- **Statistics** (opt-in) — two-sample (Welch/Student) & paired t-tests, one-way ANOVA, and
  Pearson/Spearman correlation, driving display-only significance brackets on column plots and an
  r/p readout on scatter fits.
- **Interaction** — hovering a series lifts it to full opacity and dims the rest, with rich
  tooltips (mean ± error, n; per-point values; heatmap row·column·value; scatter residuals).
  Heatmaps get a hover crosshair; XY plots get spike crosshairs; volcano points are click-to-label.
- **Export & reproducibility** — PNG at 1–3×, SVG, a transparent-background toggle (WYSIWYG),
  slide-shaped size presets, one-click **copy to clipboard**, and **save/load** a `.pplot.json`
  project (data + roles + plot type + style) so a figure's exact inputs travel with it.

## Build

```bash
npm run build     # → dist/ (static, host anywhere)
npm run typecheck
```

## Docs

- [`pplot-spec.md`](./pplot-spec.md) — full product spec and roadmap (Phases 1–3).
- [`CLAUDE.md`](./CLAUDE.md) — architecture notes and conventions.

Example datasets are **synthetic** and labelled as such in the app.
