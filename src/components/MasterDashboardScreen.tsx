// src/components/MasterDashboardScreen.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  FlavorAttribute,
  SessionCoffee,
  TastingSession,
} from '../types/domain';

import {
  addCoffeeToSession,
  listenToCoffees,
  listenToSession,
} from '../services/sessionService';

import {
  getFlavorAttributesForOrg,
  indexAttributesById,
} from '../services/flavorAttributeService';

import { useCoffeeDashboard } from '../hooks/useMasterDashboard';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from './ui/ThemeToggle';
import { Card } from './ui/Card';
import { AppButton } from './ui/AppButton';

interface Props {
  sessionId: string;
  masterId: string;
  masterName: string;
}

export function MasterDashboardScreen({
  sessionId,
  masterId,
  masterName,
}: Props) {
  const { theme } = useTheme();

  const [session, setSession] = useState<TastingSession | null>(null);
  const [coffees, setCoffees] = useState<SessionCoffee[]>([]);
  const [attributes, setAttributes] = useState<FlavorAttribute[]>([]);
  const [newCoffeeName, setNewCoffeeName] = useState('');
  const [addingCoffee, setAddingCoffee] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToSession(sessionId, setSession);
    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    const unsubscribe = listenToCoffees(sessionId, setCoffees);
    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    getFlavorAttributesForOrg(null)
      .then(setAttributes)
      .catch((err) => {
        console.warn('No se pudieron cargar atributos:', err);
      });
  }, []);

  const attributesById = useMemo(
    () => indexAttributesById(attributes),
    [attributes]
  );

  const handleAddCoffee = async () => {
    if (!newCoffeeName.trim()) {
      setError('Ingresa el nombre del café antes de agregarlo.');
      return;
    }

    setError(null);
    setAddingCoffee(true);

    try {
      const tableLabel = String(Math.floor(100 + Math.random() * 900));

      await addCoffeeToSession({
        sessionId,
        name: newCoffeeName.trim(),
        tableLabel,
        order: coffees.length,
      });

      setNewCoffeeName('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo agregar el café.'
      );
    } finally {
      setAddingCoffee(false);
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  const sessionTitle = session?.name ?? 'Sesión de cata';

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
              CoffeeMind
            </Text>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              {sessionTitle}
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Master: {masterName || masterId}
            </Text>
          </View>

          <ThemeToggle />
        </View>

        {session && (
          <Card elevated style={styles.joinCard}>
            <Text
              style={[
                styles.joinCodeLabel,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              Código para unirse
            </Text>

            <Text
              selectable
              style={[
                styles.joinCodeValue,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              {session.joinCode || '------'}
            </Text>

            <Text
              style={[
                styles.joinCodeHint,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              Comparte este código con los catadores para que ingresen desde la
              pantalla inicial.
            </Text>
          </Card>
        )}

        <View style={styles.kpiGrid}>
          <DashboardKpi
            label="Cafés"
            value={coffees.length}
          />

          <DashboardKpi
            label="Modo"
            value={session?.isBlind ? 'Ciego' : 'Visible'}
          />
        </View>

        <Card style={styles.addCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Agregar café
          </Text>

          <Text style={[styles.cardHint, { color: theme.colors.textMuted }]}>
            Añade las muestras que serán evaluadas por los catadores.
          </Text>

          <View style={styles.addCoffeeRow}>
            <TextInput
              style={[
                styles.addCoffeeInput,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Ej. Honduras Marcala"
              placeholderTextColor={theme.colors.textMuted}
              value={newCoffeeName}
              onChangeText={(text) => {
                setNewCoffeeName(text);
                if (error) setError(null);
              }}
              onSubmitEditing={handleAddCoffee}
              returnKeyType="done"
            />

            <AppButton
              title="Agregar"
              onPress={handleAddCoffee}
              busy={addingCoffee}
              disabled={addingCoffee}
              style={styles.addButton}
            />
          </View>

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>
              {error}
            </Text>
          )}
        </Card>

        <View style={styles.actionsRow}>
          <AppButton
            title="🖨️ Imprimir resultados"
            onPress={handlePrint}
            variant="secondary"
            style={styles.printButton}
          />
        </View>

        <View style={styles.printArea}>
          {coffees.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Aún no hay cafés
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                Agrega cafés arriba para empezar la sesión y ver resultados en
                vivo.
              </Text>
            </Card>
          ) : (
            coffees.map((coffee) => (
              <CoffeeResultCard
                key={coffee.id}
                sessionId={sessionId}
                coffee={coffee}
                attributesById={attributesById}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DashboardKpi({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  const { theme } = useTheme();

  return (
    <Card compact style={styles.kpiCard}>
      <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>

      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
        {value}
      </Text>
    </Card>
  );
}

function CoffeeResultCard({
  sessionId,
  coffee,
  attributesById,
}: {
  sessionId: string;
  coffee: SessionCoffee;
  attributesById: Record<string, FlavorAttribute>;
}) {
  const { theme } = useTheme();
  const { result, kpis } = useCoffeeDashboard(
    sessionId,
    coffee,
    attributesById
  );

  if (!result) {
    return (
      <Card style={styles.resultCard}>
        <ActivityIndicator color={theme.colors.primarySoft} />
      </Card>
    );
  }

  return (
    <Card elevated style={styles.resultCard}>
      <View style={styles.resultHeaderRow}>
        <View style={styles.resultHeaderText}>
          <Text style={[styles.sampleLabel, { color: theme.colors.accent }]}>
            Muestra #{result.tableLabel}
          </Text>

          <Text style={[styles.resultCoffeeName, { color: theme.colors.text }]}>
            {result.coffeeName}
          </Text>
        </View>

        <View
          style={[
            styles.scorePill,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.scorePillLabel, { color: theme.colors.textMuted }]}>
            Score
          </Text>

          <Text style={[styles.scorePillValue, { color: theme.colors.primarySoft }]}>
            {result.averageScore > 0 ? result.averageScore.toFixed(2) : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.innerKpiRow}>
        <MiniMetric
          label="Catadores"
          value={kpis.totalTasters}
        />

        <MiniMetric
          label="Menciones"
          value={kpis.totalDescriptorMentions}
        />

        <MiniMetric
          label="Desc./catador"
          value={kpis.averageDescriptorsPerTaster}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          Catadores
        </Text>

        {result.scoreByTaster.length === 0 ? (
          <Text style={[styles.mutedText, { color: theme.colors.textMuted }]}>
            Aún no hay evaluaciones para esta muestra.
          </Text>
        ) : (
          result.scoreByTaster.map((taster) => (
            <View
              key={taster.userId}
              style={[
                styles.tasterRow,
                {
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.tasterName, { color: theme.colors.text }]}>
                {taster.displayName}
              </Text>

              <Text
                style={[
                  styles.tasterScore,
                  {
                    color: theme.colors.primarySoft,
                  },
                ]}
              >
                {taster.score.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          Top descriptores
        </Text>

        {result.topDescriptors.length === 0 ? (
          <Text style={[styles.mutedText, { color: theme.colors.textMuted }]}>
            Todavía no hay descriptores seleccionados.
          </Text>
        ) : (
          <View style={styles.descriptorGrid}>
            {result.topDescriptors.map((descriptor) => (
              <View
                key={descriptor.attributeId}
                style={[
                  styles.descriptorChip,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.descriptorName,
                    {
                      color: theme.colors.text,
                    },
                  ]}
                >
                  {descriptor.name}
                </Text>

                <Text
                  style={[
                    styles.descriptorMeta,
                    {
                      color: theme.colors.textMuted,
                    },
                  ]}
                >
                  {descriptor.count}x · intensidad {descriptor.avgIntensity.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.miniMetric,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.miniMetricValue, { color: theme.colors.text }]}>
        {value}
      </Text>

      <Text style={[styles.miniMetricLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
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
    gap: 16,
    marginBottom: 18,
  },

  titleBlock: {
    flex: 1,
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

  joinCard: {
    alignItems: 'center',
    marginBottom: 16,
  },

  joinCodeLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  joinCodeValue: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 10,
    marginVertical: 4,
  },

  joinCodeHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  kpiCard: {
    flex: 1,
  },

  kpiLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },

  addCard: {
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  cardHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },

  addCoffeeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  addCoffeeInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  addButton: {
    minWidth: 116,
  },

  errorText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
  },

  actionsRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },

  printButton: {
    alignSelf: 'flex-start',
  },

  printArea: {
    flex: 1,
  },

  emptyCard: {
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  resultCard: {
    marginBottom: 16,
  },

  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  resultHeaderText: {
    flex: 1,
  },

  sampleLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  resultCoffeeName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  scorePill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 94,
    alignItems: 'center',
  },

  scorePillLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  scorePillValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },

  innerKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  miniMetric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  miniMetricValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  miniMetricLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },

  section: {
    marginTop: 8,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.6,
  },

  mutedText: {
    fontSize: 13,
    lineHeight: 19,
  },

  tasterRow: {
    borderTopWidth: 1,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  tasterName: {
    fontSize: 14,
    fontWeight: '700',
  },

  tasterScore: {
    fontSize: 14,
    fontWeight: '900',
  },

  descriptorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  descriptorChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  descriptorName: {
    fontSize: 13,
    fontWeight: '900',
  },

  descriptorMeta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});