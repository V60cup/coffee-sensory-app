// app/index.tsx

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  createSession,
  joinSessionByCode,
} from '../src/services/sessionService';
import {
  signInAsGuestTaster,
  signInMasterUser,
  registerMasterUser,
} from '../src/services/authService';
import { useAuth } from '../src/hooks/useAuth';
import { useTheme } from '../src/theme/ThemeProvider';
import { ThemeToggle } from '../src/components/ui/ThemeToggle';

type MasterAuthMode = 'login' | 'register';

export default function Home() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const isDark = mode === 'dark';

  const [tab, setTab] = useState<'taster' | 'master'>('taster');

  const [tasterName, setTasterName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const [masterAuthMode, setMasterAuthMode] =
    useState<MasterAuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterDisplayName, setMasterDisplayName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const actionDisabled = busy || authLoading;

  const selectedSegmentBackground = isDark ? '#E7D0B5' : '#D8BFA2';
  const selectedSegmentText = '#1F1712';
  const inactiveSegmentText = isDark ? '#EDE2D8' : theme.colors.textMuted;

  const primaryButtonBackground = actionDisabled
    ? isDark
      ? '#6B5B50'
      : '#E5D8C9'
    : isDark
      ? '#E7D0B5'
      : theme.colors.primary;

  const primaryButtonTextColor = actionDisabled
    ? isDark
      ? '#FFFFFF'
      : '#3A2D25'
    : isDark
      ? '#1F1712'
      : '#FFFFFF';

  const secondaryButtonBackground = isDark ? '#211C18' : '#F6EEE5';
  const secondaryButtonBorder = isDark ? '#6B5B50' : '#D9C8B8';
  const secondaryButtonText = isDark ? '#F7EEE6' : '#2B211B';

  const handleJoinAsTaster = async () => {
    if (authLoading) {
      setJoinError(
        'Estamos preparando la conexión. Intenta nuevamente en un momento.'
      );
      return;
    }

    if (!tasterName.trim()) {
      setJoinError('Ingresa tu nombre para unirte como catador.');
      return;
    }

    if (!joinCodeInput.trim()) {
      setJoinError('Ingresa el código de la sesión.');
      return;
    }

    if (joinCodeInput.trim().length !== 6) {
      setJoinError('El código debe tener 6 dígitos.');
      return;
    }

    setJoinError(null);
    setBusy(true);

    try {
      const guestUser = await signInAsGuestTaster(tasterName.trim());

      const { sessionId } = await joinSessionByCode({
        joinCode: joinCodeInput.trim(),
        userId: guestUser.uid,
        displayName: tasterName.trim(),
      });

      router.push(
        `/(app)/session/${sessionId}?role=taster&userId=${guestUser.uid}&name=${encodeURIComponent(
          tasterName.trim()
        )}`
      );
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : 'No se pudo unir a la sesión.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMasterAuthAndCreate = async () => {
    if (authLoading) {
      setAuthError(
        'Estamos preparando la conexión. Intenta nuevamente en un momento.'
      );
      return;
    }

    if (!email.trim()) {
      setAuthError('Ingresa tu email.');
      return;
    }

    if (!password.trim()) {
      setAuthError('Ingresa tu contraseña.');
      return;
    }

    if (password.trim().length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (masterAuthMode === 'register' && !masterDisplayName.trim()) {
      setAuthError('Ingresa tu nombre para crear la cuenta.');
      return;
    }

    if (!sessionName.trim()) {
      setAuthError('Ingresa un nombre para la sesión.');
      return;
    }

    setAuthError(null);
    setBusy(true);

    try {
      const masterUser =
        masterAuthMode === 'register'
          ? await registerMasterUser({
              email: email.trim(),
              password: password.trim(),
              displayName: masterDisplayName.trim(),
            })
          : await signInMasterUser({
              email: email.trim(),
              password: password.trim(),
            });

      const nameForSession =
        masterUser.displayName ?? masterDisplayName.trim() ?? email.trim();

      const { sessionId } = await createSession({
        name: sessionName.trim(),
        masterId: masterUser.uid,
        masterDisplayName: nameForSession,
        isBlind: false,
      });

      router.push(
        `/(app)/session/${sessionId}?role=master&userId=${masterUser.uid}&name=${encodeURIComponent(
          nameForSession
        )}`
      );
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenHistory = () => {
    if (authLoading) {
      setAuthError(
        'Estamos preparando la conexión. Intenta nuevamente en un momento.'
      );
      return;
    }

    if (!user || user.isAnonymous) {
      setAuthError('Inicia sesión como master para ver tu historial.');
      return;
    }

    router.push('/(app)/history');
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.page}>
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={[styles.brandEyebrow, { color: theme.colors.accent }]}>
              Ensamble
            </Text>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              Cata Sensorial
            </Text>
          </View>

          <ThemeToggle />
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Registra, comparte y analiza anotaciones sensoriales de café en tiempo
          real.
        </Text>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            Catas más simples, resultados más claros.
          </Text>

          <Text style={[styles.heroText, { color: theme.colors.textMuted }]}>
            Crea una sesión como master o únete como catador usando un código de
            6 dígitos.
          </Text>
        </View>

        {authLoading && (
          <View
            style={[
              styles.inlineStatus,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ActivityIndicator size="small" color={theme.colors.primarySoft} />

            <Text
              style={[
                styles.inlineStatusText,
                { color: theme.colors.textMuted },
              ]}
            >
              Preparando conexión segura...
            </Text>
          </View>
        )}

        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Pressable
            style={[
              styles.segmentButton,
              tab === 'taster' && {
                backgroundColor: selectedSegmentBackground,
              },
            ]}
            onPress={() => {
              setTab('taster');
              setAuthError(null);
            }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    tab === 'taster'
                      ? selectedSegmentText
                      : inactiveSegmentText,
                },
              ]}
            >
              Tengo un código
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentButton,
              tab === 'master' && {
                backgroundColor: selectedSegmentBackground,
              },
            ]}
            onPress={() => {
              setTab('master');
              setJoinError(null);
            }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    tab === 'master'
                      ? selectedSegmentText
                      : inactiveSegmentText,
                },
              ]}
            >
              Soy Master
            </Text>
          </Pressable>
        </View>

        {tab === 'taster' ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Unirse como catador
            </Text>

            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
              No necesitas cuenta. Solo ingresa tu nombre y el código de la
              sesión.
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Nombre del catador
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Tu nombre"
              placeholderTextColor={theme.colors.textMuted}
              value={tasterName}
              onChangeText={(text) => {
                setTasterName(text);
                if (joinError) setJoinError(null);
              }}
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Código de sesión (6 dígitos)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.codeInput,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="123456"
              placeholderTextColor={theme.colors.textMuted}
              value={joinCodeInput}
              onChangeText={(text) => {
                setJoinCodeInput(text.replace(/[^0-9]/g, '').slice(0, 6));
                if (joinError) setJoinError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
            />

            {joinError && (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {joinError}
              </Text>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: primaryButtonBackground,
                  borderColor: primaryButtonBackground,
                  opacity: actionDisabled ? 0.86 : 1,
                },
              ]}
              onPress={handleJoinAsTaster}
              disabled={actionDisabled}
            >
              {busy ? (
                <ActivityIndicator color={primaryButtonTextColor} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color: primaryButtonTextColor,
                    },
                  ]}
                >
                  {authLoading ? 'Preparando...' : 'Unirme'}
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Crear sesión como Master
            </Text>

            <View
              style={[
                styles.miniSegmentedControl,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.miniSegment,
                  masterAuthMode === 'login' && {
                    backgroundColor: selectedSegmentBackground,
                  },
                ]}
                onPress={() => {
                  setMasterAuthMode('login');
                  setAuthError(null);
                }}
              >
                <Text
                  style={[
                    styles.miniSegmentText,
                    {
                      color:
                        masterAuthMode === 'login'
                          ? selectedSegmentText
                          : inactiveSegmentText,
                    },
                  ]}
                >
                  Ya tengo cuenta
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.miniSegment,
                  masterAuthMode === 'register' && {
                    backgroundColor: selectedSegmentBackground,
                  },
                ]}
                onPress={() => {
                  setMasterAuthMode('register');
                  setAuthError(null);
                }}
              >
                <Text
                  style={[
                    styles.miniSegmentText,
                    {
                      color:
                        masterAuthMode === 'register'
                          ? selectedSegmentText
                          : inactiveSegmentText,
                    },
                  ]}
                >
                  Crear cuenta
                </Text>
              </Pressable>
            </View>

            {masterAuthMode === 'register' && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  Nombre del Master
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Tu nombre"
                  placeholderTextColor={theme.colors.textMuted}
                  value={masterDisplayName}
                  onChangeText={(text) => {
                    setMasterDisplayName(text);
                    if (authError) setAuthError(null);
                  }}
                />
              </>
            )}

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Email
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (authError) setAuthError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Contraseña
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Contraseña"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (authError) setAuthError(null);
              }}
              secureTextEntry
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Nombre de la sesión
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Ej: Cata filtrados junio"
              placeholderTextColor={theme.colors.textMuted}
              value={sessionName}
              onChangeText={(text) => {
                setSessionName(text);
                if (authError) setAuthError(null);
              }}
            />

            {authError && (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {authError}
              </Text>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: primaryButtonBackground,
                  borderColor: primaryButtonBackground,
                  opacity: actionDisabled ? 0.86 : 1,
                },
              ]}
              onPress={handleMasterAuthAndCreate}
              disabled={actionDisabled}
            >
              {busy ? (
                <ActivityIndicator color={primaryButtonTextColor} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color: primaryButtonTextColor,
                    },
                  ]}
                >
                  {authLoading
                    ? 'Preparando...'
                    : masterAuthMode === 'register'
                      ? 'Crear cuenta y sesión'
                      : 'Entrar y crear sesión'}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: secondaryButtonBackground,
                  borderColor: secondaryButtonBorder,
                  opacity: authLoading || pressed ? 0.76 : 1,
                },
              ]}
              onPress={handleOpenHistory}
              disabled={authLoading}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  {
                    color: secondaryButtonText,
                  },
                ]}
              >
                Ver historial de sesiones
              </Text>
            </Pressable>
          </View>
        )}

        {user && (
          <Text style={[styles.sessionHint, { color: theme.colors.textMuted }]}>
            Sesión activa de Firebase:{' '}
            {user.isAnonymous ? 'invitado' : user.email}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese email. Prueba "Ya tengo cuenta".';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email o contraseña incorrectos.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'El email no es válido.';
    default:
      return err instanceof Error
        ? err.message
        : 'Ocurrió un error de autenticación.';
  }
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 56 : 72,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  brandEyebrow: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
  },
  inlineStatus: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '900',
  },
  card: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  miniSegmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  miniSegment: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  miniSegmentText: {
    fontSize: 12,
    fontWeight: '900',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 15,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    fontWeight: '900',
    fontSize: 14,
  },
  sessionHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});