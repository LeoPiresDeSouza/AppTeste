/** Lê um arquivo local (escolhido pelo usuário) como base64. Versão web. */
export async function readFileAsBase64(uri: string): Promise<string> {
  // Na web o seletor devolve uma data URL ou blob URL; o fetch resolve as duas.
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
