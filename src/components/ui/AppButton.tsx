// src/components/ui/AppButton.tsx

import {
  ActivityIndicator,
  Pressable,
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
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: Props) {
  const { theme } = useTheme();

  const isDisabled = disabled || busy;

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
        ? theme.colors.danger
        : theme.colors.surfaceAlt;

  const color =
    variant === 'secondary'
      ? theme.colors.text
      : theme.colors.white ?? '#FFFFFF';

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.text, { color }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  text: {
    fontSize: 15,
    fontWeight: '800',
  },
});