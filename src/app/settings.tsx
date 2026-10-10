import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../lib/Button';
import { checkConnection } from '../lib/github';
import { Settings, useSettings } from '../lib/settings';
import { colors, common } from '../lib/theme';

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

type Field = { key: keyof Settings; label: string; placeholder: string; hint?: string; secret?: boolean };

const FIELDS: Field[] = [
  {
    key: 'token',
    label: 'Token do GitHub',
    placeholder: 'github_pat_...',
    hint: 'Necessário apenas para enviar receitas.',
    secret: true,
  },
  { key: 'owner', label: 'Dono do repositório', placeholder: 'LeoPiresDeSouza' },
  { key: 'repo', label: 'Repositório', placeholder: 'recipes' },
  { key: 'branch', label: 'Branch', placeholder: 'master' },
  { key: 'folder', label: 'Pasta das receitas novas', placeholder: 'uploads', hint: 'Deixe vazio para a raiz.' },
];

export default function SettingsScreen() {
  const { settings, save } = useSettings();
  const [form, setForm] = useState<Settings>(settings);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState<'saving' | 'checking' | null>(null);

  // As configurações carregam de forma assíncrona; sincroniza o formulário quando chegam.
  useEffect(() => setForm(settings), [settings]);

  const trimmed = (): Settings => ({
    token: form.token.trim(),
    owner: form.owner.trim(),
    repo: form.repo.trim(),
    branch: form.branch.trim(),
    folder: form.folder.trim(),
  });

  const onCheck = async () => {
    setBusy('checking');
    setStatus(null);
    try {
      const result = await checkConnection(trimmed());
      if (result.canPush) {
        setStatus({ ok: true, message: `Conectado a ${result.fullName} com permissão de escrita.` });
      } else if (form.token.trim()) {
        setStatus({
          ok: false,
          message: `Conectado a ${result.fullName}, mas o token não tem permissão de escrita (Contents: Read and write).`,
        });
      } else {
        setStatus({ ok: true, message: `Conectado a ${result.fullName}. Sem token, só é possível ler.` });
      }
    } catch (e) {
      setStatus({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    const next = trimmed();
    if (!next.owner || !next.repo || !next.branch) {
      setStatus({ ok: false, message: 'Dono, repositório e branch são obrigatórios.' });
      return;
    }
    setBusy('saving');
    try {
      await save(next);
      router.back();
    } catch (e) {
      setStatus({ ok: false, message: e instanceof Error ? e.message : String(e) });
      setBusy(null);
    }
  };

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={common.label}>{field.label}</Text>
          <TextInput
            style={common.input}
            value={form[field.key]}
            onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
            placeholder={field.placeholder}
            placeholderTextColor={colors.muted}
            secureTextEntry={field.secret}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {field.hint && <Text style={common.hint}>{field.hint}</Text>}
        </View>
      ))}

      {status && <Text style={status.ok ? common.success : common.error}>{status.message}</Text>}

      <Button title="Testar conexão" variant="secondary" onPress={onCheck} loading={busy === 'checking'} />
      <Button title="Salvar" onPress={onSave} loading={busy === 'saving'} />

      <View style={[common.card, styles.help]}>
        <Text style={common.label}>Como criar o token</Text>
        <Text style={common.hint}>
          1. Abra a página de tokens do GitHub (botão abaixo).{'\n'}
          2. Em "Repository access", escolha "Only select repositories" e selecione o repositório de receitas.{'\n'}
          3. Em "Permissions → Repository permissions", defina "Contents" como "Read and write".{'\n'}
          4. Gere o token, copie e cole no campo acima.
        </Text>
        <Text style={common.hint}>
          {Platform.OS === 'web'
            ? 'Na versão web o token fica salvo apenas neste navegador.'
            : 'O token fica salvo apenas neste aparelho, no armazenamento seguro do sistema.'}
        </Text>
        <Button title="Criar token no GitHub" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(NEW_TOKEN_URL)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  help: { gap: 10, marginTop: 8 },
});
