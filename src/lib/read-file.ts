import { File } from 'expo-file-system';

/** Endereço local para um arquivo escolhido. No Android/iOS o URI do seletor já serve. */
export async function localFileUri(asset: { uri: string }): Promise<string> {
  return asset.uri;
}

/** Lê um arquivo local (escolhido pelo usuário) como base64. Versão Android/iOS. */
export async function readFileAsBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}
