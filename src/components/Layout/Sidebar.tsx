import type { ReactNode } from 'react';
import { ExampleMenu } from '../DataPanel/ExampleMenu';
import { ImportButton } from '../DataPanel/ImportButton';
import { PlotTypePicker } from '../Controls/PlotTypePicker';
import { ColumnRoles } from '../Controls/ColumnRoles';
import { StyleControls } from '../Controls/StyleControls';
import { ExportControls } from '../Controls/ExportControls';
import { ProjectControls } from '../Controls/ProjectControls';
import { SectionTitle, Button } from '../ui';

// Left control rail (§10): Data · Plot · Columns · Style · Export.
export function Sidebar({ onOpenPaste }: { onOpenPaste: () => void }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-surface p-4 lg:w-72">
      <Section title="Data">
        <Button variant="primary" onClick={onOpenPaste} className="w-full">
          Paste data
        </Button>
        <div className="mt-3">
          <ImportButton />
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Examples</p>
          <ExampleMenu />
        </div>
      </Section>

      <Section title="Plot">
        <PlotTypePicker />
      </Section>

      <Section title="Columns">
        <ColumnRoles />
      </Section>

      <Section title="Style">
        <StyleControls />
      </Section>

      <Section title="Export">
        <ExportControls />
      </Section>

      <Section title="Project">
        <ProjectControls />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}
