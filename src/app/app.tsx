import { Toolbar } from '@/app/toolbar/toolbar';
import { ZoomControls } from '@/app/toolbar/zoom-controls';
import { createLitePlugins } from '@/plugins';
import { EditorProvider } from '@/react';

const mLitePlugins = createLitePlugins();

export function App() {
  return (
    <EditorProvider
      plugins={mLitePlugins}
      className="grid h-screen grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground"
    >
      <header className="row-start-1 flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <h1 className="mr-2 text-lg font-semibold tracking-tight">Kanvaskit</h1>
        <Toolbar />
        <div className="ml-auto">
          <ZoomControls />
        </div>
      </header>
    </EditorProvider>
  );
}
