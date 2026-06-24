// app/(app)/session/[id].tsx
// Punto de entrada de la sesión.
// Decide qué vista mostrar según el rol:
// - master -> MasterDashboardScreen
// - taster -> TasterScoringScreen

import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { MasterDashboardScreen } from '../../../src/components/MasterDashboardScreen';
import { TasterScoringScreen } from '../../../src/components/TasterScoringScreen';

export default function SessionScreen() {
  const { id, role, userId, name } = useLocalSearchParams<{
    id?: string;
    role?: string;
    userId?: string;
    name?: string;
  }>();

  const sessionId = typeof id === 'string' ? id : '';
  const currentUserId = typeof userId === 'string' ? userId : '';
  const displayName = typeof name === 'string' ? name : '';
  const currentRole = typeof role === 'string' ? role : 'taster';

  if (!sessionId || !currentUserId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Faltan parámetros de sesión.</Text>
        <Text style={styles.text}>
          No se pudo cargar la sesión porque falta el ID de sesión o el ID de usuario.
        </Text>
      </View>
    );
  }

  if (currentRole === 'master') {
    return (
      <MasterDashboardScreen
        sessionId={sessionId}
        masterId={currentUserId}
        masterName={displayName}
      />
    );
  }

  return (
    <TasterScoringScreen
      sessionId={sessionId}
      userId={currentUserId}
      displayName={displayName}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    opacity: 0.75,
  },
});