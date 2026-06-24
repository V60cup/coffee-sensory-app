// src/components/ui/ThemeToggle.tsx

import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { radius, spacing } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';

export function ThemeToggle() {
  const { theme, mode, toggleTheme } = useTheme();

  const isDark = mode === 'dark';

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={toggleTheme}
    >
      <Text
        style={[
          styles.icon,
          {
            color: theme.colors.accent,
          },
        ]}
      >
        {isDark ? '☀️' : '🌙'}
      </Text>

      <Text
        style={[
          styles.text,
          {
            color: theme.colors.text,
          },
        ]}
      >
        {isDark ? 'Modo Claro' : 'Modo Oscuro'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: radius.pill,
    borderWidth: 1,

    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,

    gap: spacing.sm,
  },

  icon: {
    fontSize: 16,
  },

  text: {
    fontSize: 13,
    fontWeight: '800',
  },
});