import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout } from 'plotly.js';

type Ref = MutableRefObject<HTMLDivElement | null>;

// Thin imperative Plotly hook (§2). Draws with Plotly.react on every change,
// (re)attaches hover behavior after each draw, resizes with its container, and
// purges on unmount. Keeping it imperative gives full control over the
// hover-highlight restyling that react-plotly.js would fight us on.
export function usePlotly(
  ref: Ref,
  traces: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
  attach?: (gd: HTMLDivElement) => () => void
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let detach: (() => void) | null = null;
    let cancelled = false;
    Plotly.react(el, traces, layout, config).then(() => {
      if (cancelled) return;
      detach = attach ? attach(el) : null;
    });
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [ref, traces, layout, config, attach]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (ref.current) void Plotly.Plots.resize(ref.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  useEffect(() => {
    return () => {
      if (ref.current) Plotly.purge(ref.current);
    };
  }, [ref]);
}
