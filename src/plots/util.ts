import type { ErrorKind } from '../data/types';
import type { Summary } from '../lib/stats';

// Compact, readable number formatting for hover readouts.
export function fmt(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return n.toExponential(2);
  return String(Number(n.toPrecision(digits)));
}

// Darken (or lighten, with a positive amount) a #rrggbb color for bar borders.
export function shade(hex: string, amt = -0.18): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const clamp = (x: number) => Math.round(Math.min(255, Math.max(0, x + amt * 255)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// #rrggbb → rgba() with an explicit alpha, for translucent fills.
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function errValue(kind: ErrorKind, s: Summary): number | undefined {
  switch (kind) {
    case 'sd':
      return s.sd;
    case 'sem':
      return s.sem;
    case 'ci95':
      return s.ci95;
    case 'none':
    default:
      return undefined;
  }
}

export const errorLabel: Record<ErrorKind, string> = {
  sd: 'SD',
  sem: 'SEM',
  ci95: '95% CI',
  none: '',
};

// Shared hover styling so tooltips read as one system across plot types.
export const hoverStyle = {
  bgcolor: '#FFFFFF',
  bordercolor: '#CDD5DE',
  font: { family: 'Arial, Helvetica, sans-serif', size: 13, color: '#141A22' },
};
