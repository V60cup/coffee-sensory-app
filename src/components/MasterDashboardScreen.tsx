// src/components/MasterDashboardScreen.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  getDefaultFlavorAttributes,
  getFlavorAttributesForOrg,
  indexAttributesById,
} from '../services/flavorAttributeService';
import { useCoffeeDashboard } from '../hooks/useMasterDashboard';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from './ui/ThemeToggle';
import { Card } from './ui/Card';
import { AppButton } from './ui/AppButton';
import { SessionBlindSettingsCard } from './SessionBlindSettingsCard';
import {
  getFlavorColor,
  getFlavorDisplayName,
  shadeColor,
  tintColor,
} from '../data/flavorLocalization';
import {
  canShowCoffeeMetadata,
  getCoffeeSampleLabel,
} from '../utils/coffeeDisplay';

interface Props {
  sessionId: string;
  masterId: string;
  masterName: string;

  /**
   * organizationId del Master, si pertenece a alguna.
   * Si es null, se usan los descriptores default del sistema.
   */
  organizationId?: string | null;
}

interface CoffeeDraftForm {
  name: string;
  origin: string;
  variety: string;
  process: string;
  harvestDate: string;
  description: string;
}

interface DescriptorChipData {
  attributeId: string;
  name: string;
  count: number;
  avgIntensity: number;
}

interface CategoryChipData {
  categoryId: string;
  name: string;
  count: number;
  avgIntensity: number;
}

const EMPTY_COFFEE_DRAFT: CoffeeDraftForm = {
  name: '',
  origin: '',
  variety: '',
  process: '',
  harvestDate: '',
  description: '',
};

function getCoffeeDraftStorageKey(sessionId: string, masterId: string): string {
  return `ensamble:coffee-draft:${sessionId}:${masterId}`;
}

function hasDraftContent(draft: CoffeeDraftForm): boolean {
  return Object.values(draft).some((value) => value.trim().length > 0);
}

function parseStoredDraft(value: string | null): CoffeeDraftForm {
  if (!value) {
    return EMPTY_COFFEE_DRAFT;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CoffeeDraftForm>;

    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      origin: typeof parsed.origin === 'string' ? parsed.origin : '',
      variety: typeof parsed.variety === 'string' ? parsed.variety : '',
      process: typeof parsed.process === 'string' ? parsed.process : '',
      harvestDate:
        typeof parsed.harvestDate === 'string' ? parsed.harvestDate : '',
      description:
        typeof parsed.description === 'string' ? parsed.description : '',
    };
  } catch {
    return EMPTY_COFFEE_DRAFT;
  }
}

export function MasterDashboardScreen({
  sessionId,
  masterId,
  masterName,
  organizationId = null,
}: Props) {
  const { theme } = useTheme();

  const [session, setSession] = useState<TastingSession | null>(null);
  const [coffees, setCoffees] = useState<SessionCoffee[]>([]);

  const [attributes, setAttributes] = useState<FlavorAttribute[]>(
    getDefaultFlavorAttributes
  );

  const [coffeeDraft, setCoffeeDraft] =
    useState<CoffeeDraftForm>(EMPTY_COFFEE_DRAFT);

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [draftStatus, setDraftStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const [addingCoffee, setAddingCoffee] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const sessionTitle = session?.name ?? 'Sesión de cata';

  const draftStorageKey = useMemo(
    () => getCoffeeDraftStorageKey(sessionId, masterId),
    [sessionId, masterId]
  );

  useEffect(() => {
    const unsubscribe = listenToSession(sessionId, setSession);

    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    const unsubscribe = listenToCoffees(sessionId, setCoffees);

    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    if (!organizationId) return;

    getFlavorAttributesForOrg(organizationId)
      .then(setAttributes)
      .catch((err) => {
        console.warn('No se pudieron cargar atributos:', err);
      });
  }, [organizationId]);

  useEffect(() => {
    let mounted = true;

    async function loadLocalDraft() {
      try {
        const storedValue = await AsyncStorage.getItem(draftStorageKey);
        const storedDraft = parseStoredDraft(storedValue);

        if (!mounted) return;

        setCoffeeDraft(storedDraft);
        setDraftStatus(hasDraftContent(storedDraft) ? 'saved' : 'idle');
      } catch (err) {
        console.warn('No se pudo cargar el borrador local:', err);

        if (!mounted) return;

        setDraftStatus('error');
      } finally {
        if (mounted) {
          setDraftDirty(false);
          setDraftLoaded(true);
        }
      }
    }

    setDraftLoaded(false);
    setDraftDirty(false);
    loadLocalDraft();

    return () => {
      mounted = false;
    };
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftLoaded || !draftDirty) return;

    const timeoutId = setTimeout(() => {
      async function persistLocalDraft() {
        try {
          if (!hasDraftContent(coffeeDraft)) {
            await AsyncStorage.removeItem(draftStorageKey);
            setDraftStatus('idle');
            return;
          }

          setDraftStatus('saving');

          await AsyncStorage.setItem(
            draftStorageKey,
            JSON.stringify(coffeeDraft)
          );

          setDraftStatus('saved');
        } catch (err) {
          console.warn('No se pudo guardar el borrador local:', err);
          setDraftStatus('error');
        }
      }

      persistLocalDraft();
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [coffeeDraft, draftDirty, draftLoaded, draftStorageKey]);

  const attributesById = useMemo(
    () => indexAttributesById(attributes),
    [attributes]
  );

  const updateCoffeeDraftField = (
    field: keyof CoffeeDraftForm,
    value: string
  ) => {
    setCoffeeDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setDraftDirty(true);

    if (error) {
      setError(null);
    }
  };

  const clearLocalDraft = async () => {
    await AsyncStorage.removeItem(draftStorageKey);
    setCoffeeDraft(EMPTY_COFFEE_DRAFT);
    setDraftDirty(false);
    setDraftStatus('idle');
  };

  const handleAddCoffee = async () => {
    if (!coffeeDraft.name.trim()) {
      setError('Ingresa el nombre del café antes de agregarlo.');
      return;
    }

    setError(null);
    setAddingCoffee(true);

    try {
      const tableLabel = String(Math.floor(100 + Math.random() * 900));

      await addCoffeeToSession({
        sessionId,
        name: coffeeDraft.name,
        origin: coffeeDraft.origin,
        variety: coffeeDraft.variety,
        process: coffeeDraft.process,
        harvestDate: coffeeDraft.harvestDate,
        description: coffeeDraft.description,
        sessionName: sessionTitle,
        tableLabel,
        order: coffees.length,
      });

      await clearLocalDraft();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo agregar el café.'
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

  const handleCopyJoinCode = async () => {
    if (!session?.joinCode) return;

    try {
      await Clipboard.setStringAsync(session.joinCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.warn('No se pudo copiar el código:', err);
    }
  };

  const draftStatusLabel =
    draftStatus === 'saving'
      ? 'Guardando borrador local...'
      : draftStatus === 'saved'
        ? 'Borrador guardado en este dispositivo'
        : draftStatus === 'error'
          ? 'No se pudo guardar el borrador local'
          : 'El borrador se guardará localmente en este dispositivo.';

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
              {sessionTitle}
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Master: {masterName || masterId}
            </Text>
          </View>

          <ThemeToggle />
        </View>

        {session && (
          <Card style={styles.joinCard} elevated>
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

            <Pressable style={styles.joinCodeRow} onPress={handleCopyJoinCode}>
              <Text
                style={[
                  styles.joinCodeValue,
                  {
                    color: theme.colors.primary,
                  },
                ]}
              >
                {session.joinCode || '------'}
              </Text>

              <Text
                style={[
                  styles.copyIcon,
                  {
                    color: codeCopied
                      ? theme.colors.success
                      : theme.colors.textMuted,
                  },
                ]}
              >
                {codeCopied ? '✓' : '⧉'}
              </Text>
            </Pressable>

            <Text
              style={[
                styles.joinCodeHint,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              {codeCopied
                ? '¡Código copiado!'
                : 'Toca el código para copiarlo y compártelo con los catadores.'}
            </Text>
          </Card>
        )}

        {session && <SessionBlindSettingsCard session={session} />}

        <View style={styles.kpiGrid}>
          <DashboardKpi label="Cafés" value={coffees.length} />
          <DashboardKpi label="Estado" value={session?.status ?? '—'} />
        </View>

        <Card style={styles.addCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Agregar café
          </Text>

          <Text style={[styles.cardHint, { color: theme.colors.textMuted }]}>
            Carga la información de la muestra. Si sales del dashboard antes de
            agregarla, el borrador se restaurará en este mismo dispositivo.
          </Text>

          <View style={styles.formGrid}>
            <DraftInput
              label="Nombre del café *"
              placeholder="Ej: Colombia La Esperanza"
              value={coffeeDraft.name}
              onChangeText={(value) => updateCoffeeDraftField('name', value)}
            />

            <DraftInput
              label="Origen"
              placeholder="Ej: Huila, Colombia"
              value={coffeeDraft.origin}
              onChangeText={(value) => updateCoffeeDraftField('origin', value)}
            />

            <DraftInput
              label="Variedad / cultivar"
              placeholder="Ej: Caturra, Bourbon rosado"
              value={coffeeDraft.variety}
              onChangeText={(value) => updateCoffeeDraftField('variety', value)}
            />

            <DraftInput
              label="Proceso"
              placeholder="Ej: Lavado, natural, honey"
              value={coffeeDraft.process}
              onChangeText={(value) => updateCoffeeDraftField('process', value)}
            />

            <DraftInput
              label="Fecha de cosecha"
              placeholder="Ej: 2025 / 2025-2026"
              value={coffeeDraft.harvestDate}
              onChangeText={(value) =>
                updateCoffeeDraftField('harvestDate', value)
              }
            />
          </View>

          <DraftInput
            label="Descripción"
            placeholder="Notas internas, objetivo de la muestra o información del productor."
            value={coffeeDraft.description}
            onChangeText={(value) =>
              updateCoffeeDraftField('description', value)
            }
            multiline
          />

          <View style={styles.formFooter}>
            <Text
              style={[
                styles.draftStatus,
                {
                  color:
                    draftStatus === 'error'
                      ? theme.colors.danger
                      : theme.colors.textMuted,
                },
              ]}
            >
              {draftStatusLabel}
            </Text>

            <View style={styles.formActions}>
              {hasDraftContent(coffeeDraft) && (
                <AppButton
                  title="Limpiar"
                  variant="secondary"
                  onPress={clearLocalDraft}
                  disabled={addingCoffee}
                  style={styles.clearDraftButton}
                />
              )}

              <AppButton
                title="Agregar café"
                onPress={handleAddCoffee}
                busy={addingCoffee}
                disabled={addingCoffee}
                style={styles.addButton}
              />
            </View>
          </View>

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>
              {error}
            </Text>
          )}
        </Card>

        {Platform.OS === 'web' && (
          <View style={styles.actionsRow}>
            <AppButton
              title="Imprimir / PDF"
              variant="secondary"
              onPress={handlePrint}
              style={styles.printButton}
            />
          </View>
        )}

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
                session={session}
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

function DraftInput({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.inputGroup, multiline && styles.inputGroupFull]}>
      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
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
  session,
  sessionId,
  coffee,
  attributesById,
}: {
  session: TastingSession | null;
  sessionId: string;
  coffee: SessionCoffee;
  attributesById: Record<string, FlavorAttribute>;
}) {
  const { theme } = useTheme();

  const { result, kpis, rawProfiles } = useCoffeeDashboard(
    sessionId,
    coffee,
    attributesById
  );

  const showCoffeeMetadata = canShowCoffeeMetadata({
    session,
    viewerRole: 'master',
  });

  const sampleLabel = getCoffeeSampleLabel(coffee);
  const coffeeTitle = showCoffeeMetadata ? result?.coffeeName ?? coffee.name : sampleLabel;

  if (!result) {
    return null;
  }

  const coffeeMeta = [
    coffee.origin ? `Origen: ${coffee.origin}` : null,
    coffee.variety ? `Variedad: ${coffee.variety}` : null,
    coffee.process ? `Proceso: ${coffee.process}` : null,
    coffee.harvestDate ? `Cosecha: ${coffee.harvestDate}` : null,
  ].filter(Boolean) as string[];

  return (
    <Card style={styles.resultCard} elevated>
      <View style={styles.resultHeaderRow}>
        <View style={styles.resultHeaderText}>
          <Text style={[styles.sampleLabel, { color: theme.colors.textMuted }]}>
            {sampleLabel}
          </Text>

          <Text style={[styles.resultCoffeeName, { color: theme.colors.text }]}>
            {coffeeTitle}
          </Text>

          {showCoffeeMetadata && coffeeMeta.length > 0 && (
            <View style={styles.coffeeMetaWrap}>
              {coffeeMeta.map((item) => (
                <View
                  key={item}
                  style={[
                    styles.coffeeMetaChip,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.coffeeMetaText,
                      {
                        color: theme.colors.textMuted,
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {showCoffeeMetadata && coffee.description && (
            <Text
              style={[
                styles.coffeeDescription,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              {coffee.description}
            </Text>
          )}
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
          <Text
            style={[
              styles.scorePillLabel,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            Idoneidad
          </Text>

          <Text
            style={[
              styles.scorePillValue,
              {
                color: theme.colors.primary,
              },
            ]}
          >
            {kpis.totalTasters > 0 ? result.averageSuitability.toFixed(1) : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.innerKpiRow}>
        <MiniMetric label="Catadores" value={kpis.totalTasters} />
        <MiniMetric label="Menciones" value={kpis.totalDescriptorMentions} />
        <MiniMetric
          label="Desc. / catador"
          value={kpis.averageDescriptorsPerTaster.toFixed(1)}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          Catadores
        </Text>

        {rawProfiles.length === 0 ? (
          <Text style={[styles.mutedText, { color: theme.colors.textMuted }]}>
            Aún no hay evaluaciones para esta muestra.
          </Text>
        ) : (
          rawProfiles.map((profile) => (
            <View
              key={profile.userId}
              style={[
                styles.tasterRow,
                {
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.tasterName, { color: theme.colors.text }]}>
                {profile.displayName}
              </Text>

              <Text
                style={[
                  styles.tasterScore,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                {profile.descriptors.length} descriptores · idoneidad{' '}
                {profile.suitability.toFixed(1)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          Familias sensoriales
        </Text>

        {result.categorySummary.length === 0 ? (
          <Text style={[styles.mutedText, { color: theme.colors.textMuted }]}>
            Todavía no hay familias sensoriales predominantes.
          </Text>
        ) : (
          <View style={styles.categoryGrid}>
            {result.categorySummary.map((category, index) => (
              <CategorySummaryChip
                key={category.categoryId}
                category={category}
                attributesById={attributesById}
                fallbackIndex={index}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          Descriptores más mencionados
        </Text>

        {result.topDescriptors.length === 0 ? (
          <Text style={[styles.mutedText, { color: theme.colors.textMuted }]}>
            Todavía no hay descriptores seleccionados.
          </Text>
        ) : (
          <View style={styles.descriptorGrid}>
            {result.topDescriptors.map((descriptor, index) => (
              <DescriptorSummaryChip
                key={descriptor.attributeId}
                descriptor={descriptor}
                attributesById={attributesById}
                fallbackIndex={index}
              />
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

function DescriptorSummaryChip({
  descriptor,
  attributesById,
  fallbackIndex,
}: {
  descriptor: DescriptorChipData;
  attributesById: Record<string, FlavorAttribute>;
  fallbackIndex: number;
}) {
  const { theme } = useTheme();

  const attribute = attributesById[descriptor.attributeId] ?? null;
  const lineage = attribute
    ? getLineageForAttribute(attribute, attributesById)
    : [];
  const color = attribute
    ? getFlavorColor(attribute, lineage, fallbackIndex)
    : theme.colors.primary;

  const displayName = attribute
    ? getFlavorDisplayName(attribute)
    : descriptor.name;

  return (
    <View
      style={[
        styles.descriptorChip,
        {
          backgroundColor: tintColor(color, 0.82),
          borderColor: tintColor(color, 0.5),
        },
      ]}
    >
      <View style={styles.descriptorChipHeader}>
        <View
          style={[
            styles.descriptorDot,
            {
              backgroundColor: color,
            },
          ]}
        />

        <Text
          style={[
            styles.descriptorName,
            {
              color: shadeColor(color, 0.38),
            },
          ]}
        >
          {displayName}
        </Text>
      </View>

      <Text
        style={[
          styles.descriptorMeta,
          {
            color: shadeColor(color, 0.25),
          },
        ]}
      >
        {descriptor.count}x · intensidad {descriptor.avgIntensity.toFixed(1)}
      </Text>
    </View>
  );
}

function CategorySummaryChip({
  category,
  attributesById,
  fallbackIndex,
}: {
  category: CategoryChipData;
  attributesById: Record<string, FlavorAttribute>;
  fallbackIndex: number;
}) {
  const { theme } = useTheme();

  const attribute = attributesById[category.categoryId] ?? null;
  const lineage = attribute
    ? getLineageForAttribute(attribute, attributesById)
    : [];
  const color = attribute
    ? getFlavorColor(attribute, lineage, fallbackIndex)
    : theme.colors.accent;

  const displayName = attribute
    ? getFlavorDisplayName(attribute)
    : category.name;

  return (
    <View
      style={[
        styles.categoryChip,
        {
          backgroundColor: tintColor(color, 0.84),
          borderColor: tintColor(color, 0.52),
        },
      ]}
    >
      <View
        style={[
          styles.categoryDot,
          {
            backgroundColor: color,
          },
        ]}
      />

      <View style={styles.categoryTextBlock}>
        <Text
          style={[
            styles.categoryName,
            {
              color: shadeColor(color, 0.4),
            },
          ]}
        >
          {displayName}
        </Text>

        <Text
          style={[
            styles.categoryMeta,
            {
              color: shadeColor(color, 0.24),
            },
          ]}
        >
          {category.count} menciones · int. {category.avgIntensity.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

function getLineageForAttribute(
  attr: FlavorAttribute,
  attributesById: Record<string, FlavorAttribute>
): FlavorAttribute[] {
  const lineage: FlavorAttribute[] = [];
  const visitedIds = new Set<string>();

  let cursor: FlavorAttribute | null = attr;

  while (cursor && !visitedIds.has(cursor.id)) {
    lineage.unshift(cursor);
    visitedIds.add(cursor.id);

    cursor = cursor.parentId
      ? attributesById[cursor.parentId] ?? null
      : null;
  }

  return lineage;
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
    fontSize: 30,
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
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinCodeValue: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 10,
    marginVertical: 4,
  },
  copyIcon: {
    fontSize: 20,
    fontWeight: '900',
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
    marginBottom: 14,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
    minWidth: 230,
    marginBottom: 12,
  },
  inputGroupFull: {
    minWidth: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
  },
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  draftStatus: {
    flex: 1,
    minWidth: 180,
    fontSize: 12,
    fontWeight: '800',
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clearDraftButton: {
    minWidth: 96,
  },
  addButton: {
    minWidth: 132,
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
  coffeeMetaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  coffeeMetaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  coffeeMetaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  coffeeDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
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
    marginTop: 12,
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
  },
  categoryDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  categoryTextBlock: {
    flex: 1,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '900',
  },
  categoryMeta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
  descriptorChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  descriptorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  descriptorName: {
    fontSize: 13,
    fontWeight: '900',
  },
  descriptorMeta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});