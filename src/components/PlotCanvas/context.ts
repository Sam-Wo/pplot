import { createContext, useContext } from 'react';
import type { MutableRefObject } from 'react';

// Shares the Plotly graph <div> between the Plot (which draws into it) and the
// export controls (which render images from it).
export const PlotElementContext = createContext<MutableRefObject<HTMLDivElement | null> | null>(
  null
);

export function usePlotElement(): MutableRefObject<HTMLDivElement | null> {
  const ctx = useContext(PlotElementContext);
  if (!ctx) throw new Error('PlotElementContext is missing a provider');
  return ctx;
}
