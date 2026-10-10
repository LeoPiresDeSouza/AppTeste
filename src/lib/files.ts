export type RecipeKind = 'text' | 'image' | 'pdf';

const EXTENSIONS: Record<string, RecipeKind> = {
  txt: 'text',
  md: 'text',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  gif: 'image',
  pdf: 'pdf',
};

export const KIND_ICONS: Record<RecipeKind, string> = {
  text: '📄',
  image: '🖼️',
  pdf: '📕',
};

export const KIND_LABELS: Record<RecipeKind, string> = {
  text: 'Texto',
  image: 'Imagem',
  pdf: 'PDF',
};

export function kindFromPath(path: string): RecipeKind | null {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSIONS[extension] ?? null;
}

/**
 * Nome amigável a partir do caminho:
 * "uploads/bolo-de-cenoura-20261010-153012.jpg" → "Bolo de cenoura".
 */
export function displayName(path: string): string {
  const base = (path.split('/').pop() ?? path)
    .replace(/\.[^.]+$/, '')
    .replace(/-\d{8}-\d{6}$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** "Bolo de Cenoura da Vó!" → "bolo-de-cenoura-da-vo" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Carimbo de data no formato AAAAMMDD-HHMMSS, para não sobrescrever arquivos. */
export function timestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
