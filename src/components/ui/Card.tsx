// src/components/ui/Card.tsx

import { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { radius, spacing } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  compact?: boolean;
}

export function Card({
  children,
  style,
  elevated = false,
  compact = false,
}: Props) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },

        compact && styles.compact,

        elevated && styles.elevated,

        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },

  compact: {
    padding: spacing.md,
  },

  elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
});