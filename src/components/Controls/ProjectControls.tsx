import { useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { downloadProject, parseProject } from '../../export/project';
import { Button } from '../ui';

// Save/load a .pplot.json so a figure's exact inputs and settings travel with
// it (§9).
export function ProjectControls() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const { table, mapping, plotType, options } = useStore.getState();
    const name = options.title.trim() || 'figure';
    downloadProject({ table, mapping, plotType, options }, name.replace(/\s+/g, '-').toLowerCase());
  };

  const load = async (file: File) => {
    setError(null);
    try {
      const state = parseProject(await file.text());
      useStore.getState().loadProject(state);
    } catch {
      setError('That file is not a valid pplot project.');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={save}>Save project</Button>
        <Button onClick={() => inputRef.current?.click()}>Open project</Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.pplot.json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void load(f);
          e.target.value = '';
        }}
      />
      <p className="mt-2 text-[11px] text-ink-soft">
        Saves data, roles, plot type, and style to a <span className="font-data">.pplot.json</span>.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
