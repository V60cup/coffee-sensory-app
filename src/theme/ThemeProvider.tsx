// src/theme/ThemeProvider.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { AppTheme, darkTheme, lightTheme, ThemeMode } from './theme';

type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = '@coffeemind/theme-preference';

const defaultValue: ThemeContextValue = {
  theme: lightTheme,
  mode: 'light',
  preference: 'system',
  setPreference: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

function resolveMode(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined
): ThemeMode {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] =
    useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted) return;

        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .catch((error) => {
        console.warn('No se pudo cargar el tema:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const mode = resolveMode(preference, systemScheme);
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  function setPreference(nextPreference: ThemePreference) {
    setPreferenceState(nextPreference);

    AsyncStorage.setItem(STORAGE_KEY, nextPreference).catch((error) => {
      console.warn('No se pudo guardar el tema:', error);
    });
  }

  function toggleTheme() {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      preference,
      setPreference,
      toggleTheme,
    }),
    [theme, mode, preference]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}