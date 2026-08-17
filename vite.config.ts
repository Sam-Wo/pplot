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
const standalone = !!process.env.STANDALONE;

export default defineConfig({
  base: './',
  plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
});
