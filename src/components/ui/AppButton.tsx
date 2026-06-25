// src/components/ui/AppButton.tsx

import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { radius, spacing } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
  style,
}: Props) {
  const { theme, mode } = useTheme();

  const isDisabled = disabled || busy;
  const isDark = mode === 'dark';

  const colors = getButtonColors({
    variant,
    disabled: isDisabled,
    isDark,
    theme,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy,
      }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity: pressed && !isDisabled ? 0.84 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: colors.text,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

function getButtonColors({
  variant,
  disabled,
  isDark,
  theme,
}: {
  variant: 'primary' | 'secondary' | 'danger';
  disabled: boolean;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  if (disabled) {
    return {
      background: isDark ? '#3A332D' : '#E5D8C9',
      border: isDark ? '#5B5047' : '#D2BFA9',
      text: isDark ? '#EDE2D8' : '#3A2D25',
    };
  }

  if (variant === 'secondary') {
    return {
      background: isDark ? '#211C18' : '#F6EEE5',
      border: isDark ? '#6B5B50' : '#D9C8B8',
      text: isDark ? '#F7EEE6' : '#2B211B',
    };
  }

  if (variant === 'danger') {
    return {
      background: isDark ? '#5A1F1F' : '#B42318',
      border: isDark ? '#7F2D2D' : '#B42318',
      text: '#FFFFFF',
    };
  }

  /**
   * Primary:
   * En modo oscuro usamos fondo claro con texto oscuro.
   * Esto evita el problema actual: beige claro + texto blanco.
   */
  return {
    background: isDark ? '#E7D0B5' : theme.colors.primary,
    border: isDark ? '#E7D0B5' : theme.colors.primary,
    text: isDark ? '#1F1712' : '#FFFFFF',
  };
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
});