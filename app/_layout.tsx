// app/_layout.tsx

import { Stack } from 'expo-router';

import { AppThemeProvider } from '../src/theme/ThemeProvider';
import { AuthProvider } from '../src/hooks/useAuth';

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </AppThemeProvider>
  );
}