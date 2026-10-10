/**
 * Converte fotos HEIC/HEIF para JPEG. No Android/iOS o seletor de imagens já
 * entrega um formato compatível, então só a versão web (heic.web.ts) converte.
 */
export async function convertHeicIfNeeded(
  _uri: string,
  _mimeType?: string | null,
  _fileName?: string | null,
): Promise<{ uri: string; mimeType: string } | null> {
  return null;
}
