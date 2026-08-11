import { useCallback, useEffect, useRef, useState } from 'react';
import { PlotElementContext } from './components/PlotCanvas/context';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Plot } from './components/PlotCanvas/Plot';
import { Grid } from './components/DataPanel/Grid';
import { PasteModal } from './components/DataPanel/PasteModal';

export default function App() {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteSeed, setPasteSeed] = useState('');

  const openPaste = useCallback((seed = '') => {
    setPasteSeed(seed);
    setPasteOpen(true);
  }, []);

  // Global Ctrl/Cmd-V routes into the paste panel's preview — never a silent
  // load (§6a). Ignored when focus is already in an editable field.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (pasteOpen) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim()) return;
      e.preventDefault();
      openPaste(text);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pasteOpen, openPaste]);

  return (
    <PlotElementContext.Provider value={plotRef}>
      <div className="flex h-full flex-col">
        <Header />
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <Sidebar onOpenPaste={() => openPaste('')} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3">
            <div className="min-h-[320px] flex-1 rounded-lg border border-line bg-surface p-3 shadow-sm">
              <Plot />
            </div>
            <div className="h-[38%] min-h-[180px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
              <Grid />
            </div>
          </main>
        </div>
      </div>
      <PasteModal open={pasteOpen} initialText={pasteSeed} onClose={() => setPasteOpen(false)} />
    </PlotElementContext.Provider>
  );
}
