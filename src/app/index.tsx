import { Link, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../lib/Button';
import { displayName, formatSize, KIND_ICONS, KIND_LABELS } from '../lib/files';
import { listRecipes, RecipeEntry } from '../lib/github';
import { useSettings } from '../lib/settings';
import { colors, common } from '../lib/theme';

export default function RecipeListScreen() {
  const { settings, loaded } = useSettings();
  const [recipes, setRecipes] = useState<RecipeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setRecipes(await listRecipes(settings));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [settings]);

  // Recarrega sempre que a tela volta ao foco (ex.: depois de enviar uma receita).
  useFocusEffect(
    useCallback(() => {
      if (loaded) load();
    }, [loaded, load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!recipes || !term) return recipes;
    return recipes.filter((r) => r.path.toLowerCase().includes(term));
  }, [recipes, search]);

  return (
    <SafeAreaView style={common.screen} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel="Configurações" hitSlop={12}>
                <Text style={styles.headerIcon}>⚙️</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      <View style={styles.searchBox}>
        <TextInput
          style={common.input}
          placeholder="Buscar receita..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {error ? (
        <View style={common.centered}>
          <Text style={common.error}>{error}</Text>
          <Button title="Tentar novamente" variant="secondary" onPress={load} />
        </View>
      ) : !filtered ? (
        <View style={common.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text style={common.hint}>
              {settings.owner}/{settings.repo} · {filtered.length} receita(s)
            </Text>
          }
          ListEmptyComponent={
            <Text style={[common.hint, styles.empty]}>
              {search ? 'Nenhuma receita encontrada.' : 'Ainda não há receitas neste repositório.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [common.card, styles.item, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: '/recipe', params: { path: item.path } })}
            >
              <Text style={styles.icon}>{KIND_ICONS[item.kind]}</Text>
              <View style={styles.itemText}>
                <Text style={styles.title} numberOfLines={2}>
                  {displayName(item.path)}
                </Text>
                <Text style={common.hint} numberOfLines={1}>
                  {KIND_LABELS[item.kind]} · {formatSize(item.size)}
                  {item.path.includes('/') ? ` · ${item.path.slice(0, item.path.lastIndexOf('/'))}` : ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <View style={styles.footer}>
        <Button title="+ Nova receita" onPress={() => router.push('/upload')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerIcon: { fontSize: 22, paddingHorizontal: 8 },
  searchBox: { paddingHorizontal: 16, paddingTop: 12 },
  list: { padding: 16, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemText: { flex: 1, gap: 2 },
  icon: { fontSize: 28 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  empty: { textAlign: 'center', marginTop: 32 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
