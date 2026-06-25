// app/(app)/history/index.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { TastingSession } from '../../../src/types/domain';
import {
  archiveSession,
  listMasterSessions,
} from '../../../src/services/sessionService';
import { useAuth } from '../../../src/hooks/useAuth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { ThemeToggle } from '../../../src/components/ui/ThemeToggle';
import { Card } from '../../../src/components/ui/Card';
import { AppButton } from '../../../src/components/ui/AppButton';

type StatusFilter = 'all' | 'open' | 'closed';

export default function HistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<TastingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const masterDisplayName = user?.displayName ?? user?.email ?? 'Master';

  const canLoadHistory = !!user && !user.isAnonymous;

  const filteredSessions = useMemo(() => {
    const normalizedSearch = normalizeText(searchText);

    return sessions.filter((session) => {
      const matchesStatus =
        statusFilter === 'all' || session.status === statusFilter;

      const matchesText =
        !normalizedSearch ||
        normalizeText(session.name).includes(normalizedSearch) ||
        normalizeText(session.joinCode).includes(normalizedSearch) ||
        normalizeText(session.status).includes(normalizedSearch);

      return matchesStatus && matchesText;
    });
  }, [searchText, sessions, statusFilter]);

  async function loadSessions() {
    if (!user || user.isAnonymous) {
      setSessions([]);
      return;
    }

    setLoadingSessions(true);
    setError(null);

    try {
      const masterSessions = await listMasterSessions(user.uid);
      setSessions(masterSessions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el historial de sesiones.'
      );
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    loadSessions();
  }, [authLoading, user?.uid]);

  function openSession(session: TastingSession) {
    if (!user) return;

    router.push(
      `/(app)/session/${session.id}?role=master&userId=${user.uid}&name=${encodeURIComponent(
        masterDisplayName
      )}`
    );
  }

  function goHome() {
    router.push('/');
  }

  function requestArchiveSession(session: TastingSession) {
    const message =
      session.status === 'open'
        ? 'Esta sesión está abierta. Al archivarla, también se cerrará y se liberará su código de acceso. Los datos no se eliminarán definitivamente.'
        : 'La sesión se ocultará del historial normal. Los datos no se eliminarán definitivamente.';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`¿Archivar "${session.name}"?\n\n${message}`);

      if (confirmed) {
        handleArchiveSession(session);
      }

      return;
    }

    Alert.alert('Archivar sesión', message, [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Archivar',
        style: 'destructive',
        onPress: () => handleArchiveSession(session),
      },
    ]);
  }

  async function handleArchiveSession(session: TastingSession) {
    setArchivingSessionId(session.id);
    setError(null);

    try {
      await archiveSession(session.id);

      setSessions((current) => {
        return current.filter((item) => item.id !== session.id);
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo archivar la sesión.'
      );
    } finally {
      setArchivingSessionId(null);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>
              Ensamble
            </Text>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              Historial
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Sesiones creadas por tu cuenta de master.
            </Text>
          </View>

          <ThemeToggle />
        </View>

        {authLoading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator color={theme.colors.primary} />

            <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>
              Verificando sesión...
            </Text>
          </Card>
        ) : !canLoadHistory ? (
          <Card style={styles.stateCard}>
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
              Inicia sesión como master
            </Text>

            <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>
              El historial solo está disponible para cuentas registradas de
              master. Los catadores invitados no tienen historial.
            </Text>

            <AppButton
              title="Volver al inicio"
              onPress={goHome}
              style={styles.stateButton}
            />
          </Card>
        ) : (
          <>
            <Card style={styles.filterCard}>
              <View style={styles.filterHeader}>
                <View style={styles.filterTitleBlock}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                    Buscar sesiones
                  </Text>

                  <Text
                    style={[styles.cardHint, { color: theme.colors.textMuted }]}
                  >
                    Filtra por nombre, código o estado. Las sesiones archivadas
                    se ocultan del historial normal.
                  </Text>
                </View>

                <AppButton
                  title="Actualizar"
                  variant="secondary"
                  onPress={loadSessions}
                  busy={loadingSessions}
                  disabled={loadingSessions}
                  style={styles.refreshButton}
                />
              </View>

              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Ej: filtrados, espresso, 123456..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
              />

              <View style={styles.statusTabs}>
                <StatusChip
                  label="Todas"
                  selected={statusFilter === 'all'}
                  onPress={() => setStatusFilter('all')}
                />
                <StatusChip
                  label="Abiertas"
                  selected={statusFilter === 'open'}
                  onPress={() => setStatusFilter('open')}
                />
                <StatusChip
                  label="Cerradas"
                  selected={statusFilter === 'closed'}
                  onPress={() => setStatusFilter('closed')}
                />
              </View>

              <Text
                style={[
                  styles.resultCount,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                {filteredSessions.length} de {sessions.length} sesiones
              </Text>
            </Card>

            {error && (
              <Card style={styles.errorCard}>
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                  {error}
                </Text>
              </Card>
            )}

            {loadingSessions && sessions.length === 0 ? (
              <Card style={styles.stateCard}>
                <ActivityIndicator color={theme.colors.primary} />

                <Text
                  style={[styles.stateText, { color: theme.colors.textMuted }]}
                >
                  Cargando historial...
                </Text>
              </Card>
            ) : filteredSessions.length === 0 ? (
              <Card style={styles.stateCard}>
                <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
                  No hay sesiones para mostrar
                </Text>

                <Text
                  style={[styles.stateText, { color: theme.colors.textMuted }]}
                >
                  Crea una sesión nueva o ajusta los filtros de búsqueda.
                </Text>

                <AppButton
                  title="Crear sesión"
                  onPress={goHome}
                  style={styles.stateButton}
                />
              </Card>
            ) : (
              <View style={styles.sessionList}>
                {filteredSessions.map((session) => (
                  <SessionHistoryCard
                    key={session.id}
                    session={session}
                    archiving={archivingSessionId === session.id}
                    onOpen={() => openSession(session)}
                    onArchive={() => requestArchiveSession(session)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatusChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusChip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surfaceAlt,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statusChipText,
          {
            color: selected ? '#FFFFFF' : theme.colors.textMuted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SessionHistoryCard({
  session,
  archiving,
  onOpen,
  onArchive,
}: {
  session: TastingSession;
  archiving: boolean;
  onOpen: () => void;
  onArchive: () => void;
}) {
  const { theme } = useTheme();

  const isOpen = session.status === 'open';

  return (
    <Card style={styles.sessionCard} elevated>
      <View style={styles.sessionCardHeader}>
        <View style={styles.sessionTitleBlock}>
          <Text style={[styles.sessionName, { color: theme.colors.text }]}>
            {session.name}
          </Text>

          <Text
            style={[
              styles.sessionDate,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            Creada: {formatDate(session.createdAt)}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isOpen
                ? theme.colors.success
                : theme.colors.surfaceAlt,
              borderColor: isOpen ? theme.colors.success : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color: isOpen ? '#FFFFFF' : theme.colors.textMuted,
              },
            ]}
          >
            {isOpen ? 'Abierta' : 'Cerrada'}
          </Text>
        </View>
      </View>

      <View style={styles.sessionMetaGrid}>
        <MetaItem label="Código" value={session.joinCode || '------'} />
        <MetaItem label="Modo ciego" value={session.isBlind ? 'Sí' : 'No'} />
        <MetaItem
          label="Oculta al master"
          value={session.hideNamesFromMaster ? 'Sí' : 'No'}
        />
      </View>

      <View style={styles.cardActions}>
        <AppButton
          title="Abrir dashboard"
          onPress={onOpen}
          style={styles.openButton}
        />

        <Pressable
          onPress={onArchive}
          disabled={archiving}
          style={({ pressed }) => [
            styles.archiveButton,
            {
              borderColor: theme.colors.danger,
              backgroundColor: theme.colors.surface,
              opacity: archiving || pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.archiveButtonText,
              {
                color: theme.colors.danger,
              },
            ]}
          >
            {archiving ? 'Archivando...' : 'Archivar'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.metaItem,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>

      <Text style={[styles.metaValue, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(value: number): string {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 48 : 28,
    paddingBottom: 48,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  filterCard: {
    marginBottom: 14,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filterTitleBlock: {
    flex: 1,
    minWidth: 220,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  refreshButton: {
    minWidth: 116,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  statusTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '900',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  errorCard: {
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stateCard: {
    alignItems: 'center',
    gap: 10,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 4,
    minWidth: 140,
  },
  sessionList: {
    gap: 14,
  },
  sessionCard: {
    marginBottom: 0,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sessionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sessionName: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sessionDate: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaItem: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 110,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  openButton: {
    minWidth: 150,
  },
  archiveButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
});