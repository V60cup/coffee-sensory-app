// src/components/ui/ThemeToggle.tsx

import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { radius, spacing } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';

export function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();

  const isDark = mode === 'dark';
  const compact = width < 420;

  const label = isDark ? 'Claro' : 'Oscuro';
  const fullLabel = isDark ? 'modo claro' : 'modo oscuro';

  /**
   * Usamos símbolos de texto, no emoji, para que el color sea controlable.
   * En algunos dispositivos los emoji ignoran el color del Text.
   */
  const icon = isDark ? '☀' : '◐';

  const backgroundColor = isDark ? '#FFFFFF' : '#111111';
  const borderColor = isDark ? '#FFFFFF' : '#111111';
  const textColor = isDark ? '#111111' : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cambiar a ${fullLabel}`}
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor,
          borderColor,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.icon,
          {
            color: textColor,
          },
        ]}
      >
        {icon}
      </Text>

      {!compact && (
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: textColor,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    minHeight: 42,
    maxWidth: 122,
  },
  buttonCompact: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: 44,
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});