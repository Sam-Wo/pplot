import Plotly from 'plotly.js-dist-min';

// Export (§9). PowerPoint-first: raster is the workhorse, SVG a bonus, and copy
// straight to the clipboard is the high-value one-click path. Transparent
// background is handled upstream by the figure layout, so exports are WYSIWYG.

export type SlideSize = 'wide' | 'square' | 'half';
export type ExportFormat = 'png' | 'svg';

export const slideSizes: Record<SlideSize, { label: string; width: number; height: number }> = {
  wide: { label: '16:9 · 1600×900', width: 1600, height: 900 },
  square: { label: 'Square · 1100×1100', width: 1100, height: 1100 },
  half: { label: 'Half-slide · 1100×800', width: 1100, height: 800 },
};

interface ExportOpts {
  format: ExportFormat;
  size: SlideSize;
  scale: number; // PNG only; SVG is resolution-independent
  filename?: string;
}

export async function downloadFigure(gd: HTMLDivElement, opts: ExportOpts): Promise<void> {
  const { width, height } = slideSizes[opts.size];
  // Render to a data URL and trigger a download ourselves — this keeps `scale`
  // control for PNG (the typed downloadImage options omit it) and handles SVG.
  const url = await Plotly.toImage(gd, {
    format: opts.format,
    width,
    height,
    scale: opts.format === 'png' ? opts.scale : 1,
  });
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.filename ?? 'pplot-figure'}.${opts.format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function clipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof window !== 'undefined' &&
    typeof window.ClipboardItem !== 'undefined'
  );
}

// Render to a PNG blob and place it on the clipboard as an image, ready to paste
// into a slide. Guarded — some browsers / sandboxed iframes block this.
export async function copyPngToClipboard(
  gd: HTMLDivElement,
  opts: { size: SlideSize; scale: number }
): Promise<void> {
  if (!clipboardSupported()) {
    throw new Error('Clipboard image copy is not supported in this browser.');
  }
  const { width, height } = slideSizes[opts.size];
  const dataUrl = await Plotly.toImage(gd, { format: 'png', width, height, scale: opts.scale });
  const blob = await (await fetch(dataUrl)).blob();
  await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
}
