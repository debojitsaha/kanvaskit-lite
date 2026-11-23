import { LayersPanel } from '@/app/panels/layers-panel';
import { ArrangeControls } from '@/app/toolbar/arrange-controls';
import { FileControls } from '@/app/toolbar/file-controls';
import { Toolbar } from '@/app/toolbar/toolbar';
import { ZoomControls } from '@/app/toolbar/zoom-controls';
import { mProWaitlistUrl, mWebsiteUrl } from '@/constants/links';
import { createLitePlugins } from '@/plugins';
import { EditorProvider } from '@/react';

const mLitePlugins = createLitePlugins();

export function App() {
  return (
    <EditorProvider
      plugins={mLitePlugins}
      className="grid h-screen grid-cols-[minmax(0,1fr)_16rem] grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground"
    >
      <header className="col-span-2 row-start-1 flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <h1 className="mr-2 text-lg font-semibold tracking-tight">Kanvaskit</h1>
        <Toolbar />
        <ArrangeControls />
        <FileControls />
        <div className="ml-auto flex items-center gap-4">
          <nav aria-label="Project links" className="flex items-center gap-3 text-sm">
            <a
              href={mWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Website
            </a>
            <a
              href={mProWaitlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Pro waitlist
            </a>
          </nav>
          <ZoomControls />
        </div>
      </header>
      <LayersPanel />
    </EditorProvider>
  );
}
