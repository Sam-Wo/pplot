import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Fully client-side app; builds to a static bundle (dist/) with no runtime
// network calls. Relative base so it can be hosted from any sub-path
// (internal URL / SharePoint) or wrapped in Tauri later.
//
// STANDALONE=1 adds viteSingleFile, which inlines all JS, CSS, and fonts into a
// single self-contained index.html — a double-click, offline, shareable file.
// Gated by the env var so the normal `npm run build` stays a multi-file dist/.
// `tsc` type-checks this file but @types/node is not a dependency; declare the
// one Node global we use so a clean `npm ci && npm run build` passes.
declare const process: { env: Record<string, string | undefined> };

const standalone = !!process.env.STANDALONE;

// EMBER serves pplot at /pplot/ and builds with PPLOT_BASE=/pplot/ (see
// Dockerfile) so asset URLs are absolute and do not depend on a trailing slash.
// Unset, the relative base keeps standalone and any-sub-path hosting working.
export default defineConfig({
  base: process.env.PPLOT_BASE || './',
  plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
});
