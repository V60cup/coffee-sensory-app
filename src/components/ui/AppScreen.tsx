// src/components/ui/AppScreen.tsx

import { ReactNode } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function AppScreen({
  children,
  style,
  padded = false,
}: Props) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.content,
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  padded: {
    padding: 16,
  },
});