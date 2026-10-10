const UNREADABLE_MESSAGE =
  'Não foi possível ler o arquivo no aparelho. Se a foto estiver só na nuvem (ex.: Google Fotos), ' +
  'baixe-a para o celular antes ou escolha outra.';

/** Lê um Blob/File como data URL, sem passar por fetch (que falha em alguns celulares). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(UNREADABLE_MESSAGE));
    reader.readAsDataURL(blob);
  });
}

/**
 * Endereço local seguro para um arquivo escolhido. Na web, converte o arquivo
 * em data URL: endereços blob: nem sempre podem ser lidos de novo depois.
 */
export async function localFileUri(asset: { uri: string; file?: File }): Promise<string> {
  return asset.file ? blobToDataUrl(asset.file) : asset.uri;
}

/** Lê um arquivo local (escolhido pelo usuário) como base64. Versão web. */
export async function readFileAsBase64(uri: string): Promise<string> {
  let dataUrl = uri;
  if (!uri.startsWith('data:')) {
    let blob: Blob;
    try {
      blob = await (await fetch(uri)).blob();
    } catch {
      throw new Error(UNREADABLE_MESSAGE);
    }
    dataUrl = await blobToDataUrl(blob);
  }
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
