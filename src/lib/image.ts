import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { readFileAsBase64 } from './read-file';

/** Fotos de celular passam fácil de 5 MB; 1600 px de largura ainda deixa a receita legível. */
const MAX_WIDTH = 1600;

/** No navegador do celular, fotos muito grandes podem travar a compressão sem dar erro. */
const COMPRESS_TIMEOUT_MS = 20_000;

/** Limite para enviar a foto original quando a compressão não funciona. */
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type PreparedImage = { uri: string; base64: string; extension: string };

type PickedImage = { uri: string; width: number; mimeType?: string | null };

/** Tamanho em bytes do arquivo representado por uma string base64. */
export function base64Size(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function compress(uri: string, width: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new Error('compressão sem resultado');
  return { uri: result.uri, base64: result.base64, extension: 'jpg' };
}

/**
 * Reduz e comprime a imagem em JPEG antes do envio. Se isso falhar ou demorar
 * demais, usa a foto original, desde que o formato e o tamanho permitam.
 */
export async function prepareImage(picked: PickedImage): Promise<PreparedImage> {
  try {
    return await withTimeout(compress(picked.uri, picked.width), COMPRESS_TIMEOUT_MS);
  } catch {
    const extension = EXTENSION_BY_MIME[picked.mimeType ?? ''] ?? (picked.mimeType ? null : 'jpg');
    if (!extension) {
      throw new Error('Não foi possível usar esta imagem. Escolha uma foto em JPEG ou PNG.');
    }
    const base64 = await readFileAsBase64(picked.uri);
    if (base64Size(base64) > MAX_ORIGINAL_BYTES) {
      throw new Error('A foto é grande demais e não pôde ser reduzida. Tente uma foto menor ou uma captura de tela.');
    }
    return { uri: picked.uri, base64, extension };
  }
}
