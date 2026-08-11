import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fully client-side app; builds to a static bundle (dist/) with no runtime
// network calls. Relative base so it can be hosted from any sub-path
// (internal URL / SharePoint) or wrapped in Tauri later.
export default defineConfig({
  base: './',
  plugins: [react()],
});
