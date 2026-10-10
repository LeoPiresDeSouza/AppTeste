import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../lib/Button';
import { formatSize, slugify, timestamp } from '../lib/files';
import { uploadRecipe } from '../lib/github';
import { base64Size, prepareImage } from '../lib/image';
import { readFileAsBase64 } from '../lib/read-file';
import { useSettings } from '../lib/settings';
import { colors, common } from '../lib/theme';

/** A API de conteúdo do GitHub não lida bem com arquivos maiores que isso. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;

type Selected =
  | { kind: 'image'; previewUri: string; base64: string; size: number; extension: string }
  | { kind: 'pdf'; name: string; base64: string; size: number };

export default function UploadScreen() {
  const { settings } = useSettings();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [busy, setBusy] = useState<'preparing' | 'sending' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImage = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy('preparing');
    try {
      const image = await prepareImage(asset);
      setSelected({
        kind: 'image',
        previewUri: image.uri,
        base64: image.base64,
        size: base64Size(image.base64),
        extension: image.extension,
      });
    } finally {
      setBusy(null);
    }
  };

  const run = (action: () => Promise<void>) => async () => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const pickFromGallery = run(async () => {
    await handleImage(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
  });

  const takePhoto = run(async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permissão da câmera negada. Libere o acesso nas configurações do celular.');
      }
    }
    await handleImage(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }));
  });

  const pickPdf = run(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_PDF_BYTES) {
      throw new Error(`O PDF tem ${formatSize(asset.size)}. O limite é ${formatSize(MAX_PDF_BYTES)}.`);
    }
    setBusy('preparing');
    const base64 = await readFileAsBase64(asset.uri);
    setSelected({ kind: 'pdf', name: asset.name, base64, size: asset.size ?? base64Size(base64) });
    setBusy(null);
    // Sugere o nome do arquivo como título, se o usuário ainda não digitou um.
    setTitle((current) => current || asset.name.replace(/\.pdf$/i, ''));
  });

  const missing = [!title.trim() && 'o nome da receita', !selected && 'uma foto ou um PDF'].filter(Boolean);

  const send = run(async () => {
    if (!selected || !title.trim()) throw new Error(`Falta informar ${missing.join(' e ')}.`);
    const slug = slugify(title);
    if (!slug) throw new Error('O nome da receita precisa ter pelo menos uma letra ou número.');
    const extension = selected.kind === 'image' ? selected.extension : 'pdf';
    const folder = settings.folder.replace(/^\/+|\/+$/g, '');
    const path = `${folder ? folder + '/' : ''}${slug}-${timestamp()}.${extension}`;

    setBusy('sending');
    await uploadRecipe(settings, path, selected.base64, `Adiciona receita: ${title.trim()}`);
    setBusy(null);
    router.replace({ pathname: '/recipe', params: { path } });
  });

  if (!settings.token) {
    return (
      <View style={common.centered}>
        <Text style={styles.bigIcon}>🔑</Text>
        <Text style={[common.hint, styles.center]}>
          Para enviar receitas o app precisa de um token do GitHub com permissão de escrita no repositório{' '}
          {settings.owner}/{settings.repo}.
        </Text>
        <Button title="Configurar token" onPress={() => router.push('/settings')} />
      </View>
    );
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      <Text style={common.label}>Nome da receita</Text>
      <TextInput
        style={common.input}
        placeholder="Ex.: Bolo de cenoura da vó"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
      />

      <Text style={common.label}>Arquivo</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button title="🖼️ Galeria" variant="secondary" onPress={pickFromGallery} disabled={!!busy} />
        </View>
        <View style={styles.flex}>
          <Button title="📷 Câmera" variant="secondary" onPress={takePhoto} disabled={!!busy} />
        </View>
      </View>
      <Button title="📕 Escolher PDF" variant="secondary" onPress={pickPdf} disabled={!!busy} />

      {busy === 'preparing' && (
        <View style={[styles.row, styles.centerRow]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[common.hint, styles.flex]}>Preparando arquivo... fotos grandes podem levar alguns segundos.</Text>
        </View>
      )}

      {selected?.kind === 'image' && (
        <View style={common.card}>
          <Image source={{ uri: selected.previewUri }} style={styles.preview} resizeMode="contain" />
          <Text style={common.hint}>Imagem pronta para envio · {formatSize(selected.size)}</Text>
        </View>
      )}
      {selected?.kind === 'pdf' && (
        <View style={common.card}>
          <Text style={styles.pdfName}>📕 {selected.name}</Text>
          <Text style={common.hint}>{formatSize(selected.size)}</Text>
        </View>
      )}

      {error && <Text style={common.error}>{error}</Text>}

      <Button
        title="Enviar para o GitHub"
        onPress={send}
        disabled={busy === 'preparing'}
        loading={busy === 'sending'}
      />
      {missing.length > 0 && !busy && <Text style={common.hint}>Falta: {missing.join(' e ')}.</Text>}
      <Text style={common.hint}>
        A receita será gravada em {settings.owner}/{settings.repo}
        {settings.folder ? `, na pasta "${settings.folder}"` : ''}, branch {settings.branch}.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  centerRow: { alignItems: 'center' },
  flex: { flex: 1 },
  preview: { width: '100%', height: 260, marginBottom: 8 },
  pdfName: { fontSize: 16, fontWeight: '600', color: colors.text },
  bigIcon: { fontSize: 48 },
  center: { textAlign: 'center' },
});
