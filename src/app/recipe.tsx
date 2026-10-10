import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../lib/Button';
import { displayName } from '../lib/files';
import { getRecipe, RecipeFile } from '../lib/github';
import { useSettings } from '../lib/settings';
import { colors, common } from '../lib/theme';

export default function RecipeScreen() {
  const { path } = useLocalSearchParams<{ path: string }>();
  const { settings, loaded } = useSettings();
  const [recipe, setRecipe] = useState<RecipeFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(3 / 4);

  useEffect(() => {
    if (!loaded || !path) return;
    let active = true;
    setRecipe(null);
    setError(null);
    getRecipe(settings, path)
      .then((file) => {
        if (!active) return;
        setRecipe(file);
        if (file.kind === 'image') {
          Image.getSize(file.downloadUrl, (w, h) => active && h > 0 && setAspectRatio(w / h));
        }
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [loaded, path, settings]);

  const title = path ? displayName(path) : 'Receita';

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title }} />
      {error ? (
        <View style={common.centered}>
          <Text style={common.error}>{error}</Text>
        </View>
      ) : !recipe ? (
        <View style={common.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={common.content}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={common.hint}>{recipe.path}</Text>

          {recipe.kind === 'text' && (
            <View style={common.card}>
              <Text style={styles.body} selectable>
                {recipe.text}
              </Text>
            </View>
          )}

          {recipe.kind === 'image' && (
            <Image
              source={{ uri: recipe.downloadUrl }}
              style={[styles.image, { aspectRatio }]}
              resizeMode="contain"
              accessibilityLabel={title}
            />
          )}

          {recipe.kind === 'pdf' && (
            <View style={[common.card, styles.pdf]}>
              <Text style={styles.pdfIcon}>📕</Text>
              <Text style={common.hint}>Receita em PDF. Ela abre no navegador.</Text>
              <Button title="Abrir PDF" onPress={() => WebBrowser.openBrowserAsync(recipe.htmlUrl)} />
            </View>
          )}

          <Button
            title="Ver no GitHub"
            variant="secondary"
            onPress={() => WebBrowser.openBrowserAsync(recipe.htmlUrl)}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  image: { width: '100%', borderRadius: 12, backgroundColor: colors.surface },
  pdf: { alignItems: 'center', gap: 12 },
  pdfIcon: { fontSize: 48 },
});
