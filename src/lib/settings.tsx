import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type Settings = {
  /** Token pessoal do GitHub. Só é necessário para enviar receitas. */
  token: string;
  owner: string;
  repo: string;
  branch: string;
  /** Pasta do repositório onde as receitas novas são gravadas. */
  folder: string;
};

export const DEFAULT_SETTINGS: Settings = {
  token: '',
  owner: 'LeoPiresDeSouza',
  repo: 'Receitas',
  branch: 'main',
  folder: 'uploads',
};

const STORAGE_KEY = 'receitas.settings';

// No celular as configurações (inclusive o token) ficam no armazenamento seguro
// do sistema. Na web não existe equivalente, então usamos o localStorage.
async function readStored(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeStored(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

type SettingsContextValue = {
  settings: Settings;
  loaded: boolean;
  save: (settings: Settings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readStored()
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      })
      .catch(() => {
        // Configuração corrompida ou inacessível: seguimos com os padrões.
      })
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback(async (next: Settings) => {
    await writeStored(JSON.stringify(next));
    setSettings(next);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return value;
}
