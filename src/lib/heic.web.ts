/**
 * Converte fotos HEIC/HEIF (padrão de iPhones e de muitos Android) para JPEG.
 * Os navegadores, em geral, não conseguem abrir esse formato, então sem a
 * conversão a foto não pode ser reduzida nem exibida.
 */
export async function convertHeicIfNeeded(
  uri: string,
  mimeType?: string | null,
  fileName?: string | null,
): Promise<{ uri: string; mimeType: string } | null> {
  const isHeic = /hei[cf]/i.test(mimeType ?? '') || /\.hei[cf]$/i.test(fileName ?? '');
  if (!isHeic) return null;

  // Biblioteca grande (~2,7 MB): carregada só quando aparece uma foto HEIC.
  const { default: heic2any } = await import('heic2any');
  const blob = await (await fetch(uri)).blob();
  const converted = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
  const jpeg = Array.isArray(converted) ? converted[0] : converted;
  return { uri: URL.createObjectURL(jpeg), mimeType: 'image/jpeg' };
}
