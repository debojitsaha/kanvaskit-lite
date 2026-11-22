export function downloadDataUrl(filename: string, dataUrl: string): void {
  triggerDownload(filename, dataUrl);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  triggerDownload(filename, objectUrl);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function readFileAsText(file: File): Promise<string> {
  return file.text();
}

function triggerDownload(filename: string, href: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}
