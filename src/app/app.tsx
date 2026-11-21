import { EditorProvider } from '@/react';

export function App() {
  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold tracking-tight">Kanvaskit</h1>
      </header>
      <EditorProvider className="relative min-h-0 flex-1" />
    </main>
  );
}
