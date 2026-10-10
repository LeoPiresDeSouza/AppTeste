import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../lib/Button';
import { checkConnection } from '../lib/github';
import { Settings, useSettings } from '../lib/settings';
import { colors, common } from '../lib/theme';

type Field = { key: keyof Settings; label: string; placeholder: string; hint?: string; secret?: boolean };

const FIELDS: Field[] = [
  {
    key: 'token',
    label: 'Token do GitHub',
    placeholder: 'github_pat_...',
    hint:
      'Necessário apenas para enviar receitas. ' +
      (Platform.OS === 'web'
        ? 'Fica salvo apenas neste navegador.'
        : 'Fica salvo apenas neste aparelho, no armazenamento seguro do sistema.'),
    secret: true,
  },
  { key: 'owner', label: 'Dono do repositório', placeholder: 'LeoPiresDeSouza' },
  { key: 'repo', label: 'Repositório', placeholder: 'Receitas' },
  { key: 'branch', label: 'Branch', placeholder: 'main' },
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
      if (!form.token.trim()) {
        setStatus({ ok: true, message: `Conectado a ${result.fullName}. Sem token, só é possível ler.` });
      } else if (result.tokenCanWrite) {
        setStatus({ ok: true, message: `Conectado a ${result.fullName}. O token tem permissão para enviar receitas.` });
      } else if (result.tokenCanWrite === false) {
        setStatus({
          ok: false,
          message: `Conectado a ${result.fullName}, mas o token não pode enviar receitas. ${result.writeError ?? ''}`,
        });
      } else {
        setStatus({
          ok: false,
          message: `Conectado a ${result.fullName}, mas não foi possível confirmar a permissão de escrita do token. ${result.writeError ?? ''}`,
        });
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
});
