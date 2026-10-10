import { File } from 'expo-file-system';

/** Lê um arquivo local (escolhido pelo usuário) como base64. Versão Android/iOS. */
export async function readFileAsBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}
