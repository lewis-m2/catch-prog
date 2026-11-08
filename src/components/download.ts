/** Saves text as a file (on Android Chrome it goes to Downloads). */
export function downloadText(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Reads a file the coach picked. */
export function readFileText(file: File): Promise<string> {
  return file.text();
}
