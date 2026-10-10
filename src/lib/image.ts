import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Fotos de celular passam fácil de 5 MB; 1600 px de largura ainda deixa a receita legível. */
const MAX_WIDTH = 1600;

export type PreparedImage = { uri: string; base64: string; width: number; height: number };

/** Reduz (se preciso) e comprime a imagem em JPEG antes do envio. */
export async function prepareImage(uri: string, width: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new Error('Não foi possível processar a imagem.');
  return { uri: result.uri, base64: result.base64, width: result.width, height: result.height };
}
