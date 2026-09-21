/// <reference types="svelte" />
/// <reference types="vite/client" />

/** Injectés à la compilation par `vite.config.ts` — affichés à l'écran (C4). */
declare const __VERSION__: string;
declare const __BUILD_DATE__: string;

/** File System Access API — absente des libs DOM de TypeScript, non disponible en `file://`. */
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}

interface FileSystemWritableFileStream {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  readonly name: string;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface Window {
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
