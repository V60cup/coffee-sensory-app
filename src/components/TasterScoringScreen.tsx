// src/components/TasterScoringScreen.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';

import {
  BASIC_TASTE_SCALE,
  FlavorAttribute,
  SessionCoffee,
  SUITABILITY_SCALE,
  TastingSession,
} from '../types/domain';
import { listenToCoffees, listenToSession } from '../services/sessionService';
import {
  getDefaultFlavorAttributes,
  getFlavorAttributesForOrg,
  indexAttributesById,
} from '../services/flavorAttributeService';
import { useTasterProfile } from '../hooks/useTasterProfile';
import { useTheme } from '../theme/ThemeProvider';
import { FlavorWheel } from './FlavorWheel';
import { RatingSlider } from './ui/RatingSlider';
import {
  canShowCoffeeMetadata,
  getCoffeeDisplayName,
  getCoffeeSampleLabel,
} from '../utils/coffeeDisplay';

interface Props {
  sessionId: string;
  userId: string;
  displayName: string;

  /**
   * organizationId del catador actual, si pertenece a alguna.
   * null en el caso típico de catador invitado.
   */
  organizationId?: string | null;
}

export function TasterScoringScreen({
  sessionId,
  userId,
  displayName,
  organizationId = null,
}: Props) {
  const { theme } = useTheme();

  const [session, setSession] = useState<TastingSession | null>(null);
  const [coffees, setCoffees] = useState<SessionCoffee[]>([]);
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);

  const [attributes, setAttributes] = useState<FlavorAttribute[]>(
    getDefaultFlavorAttributes
  );

  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToSession(sessionId, setSession);

    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = listenToCoffees(sessionId, (list) => {
      setCoffees(list);

      setSelectedCoffeeId((current) => {
        if (!current && list.length > 0) {
          return list[0].id;
        }

        if (current && !list.some((coffee) => coffee.id === current)) {
          return list.length > 0 ? list[0].id : null;
        }

        return current;
      });
    });

    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    if (!organizationId) {
      setAttributes(getDefaultFlavorAttributes());
      setIsLoadingAttributes(false);
      setAttributesError(null);
      return;
    }

    let mounted = true;

    async function loadAttributes() {
      try {
        setIsLoadingAttributes(true);
        setAttributesError(null);

        const list = await getFlavorAttributesForOrg(organizationId);

        if (mounted) {
          setAttributes(list);
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setAttributesError(
            'No se pudieron cargar los descriptores de sabor.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingAttributes(false);
        }
      }
    }

    loadAttributes();

    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const attributesById = useMemo(
    () => indexAttributesById(attributes),
    [attributes]
  );

  const selectedCoffee =
    coffees.find((coffee) => coffee.id === selectedCoffeeId) ?? null;

  if (!selectedCoffee) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          Esperando cafés...
        </Text>

        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          El Master aún no ha agregado cafés a esta sesión.
        </Text>
      </View>
    );
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
      <Text style={[styles.userLabel, { color: theme.colors.textMuted }]}>
        Catando como: {displayName}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.coffeeSelector}
        contentContainerStyle={styles.coffeeSelectorContent}
      >
        {coffees.map((coffee) => {
          const isActive = coffee.id === selectedCoffeeId;
          const sampleLabel = getCoffeeSampleLabel(coffee);

          return (
            <Pressable
              key={coffee.id}
              style={[
                styles.coffeeChip,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.surfaceAlt,
                  borderColor: isActive
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setSelectedCoffeeId(coffee.id)}
            >
              <Text
                style={[
                  styles.coffeeChipText,
                  {
                    color: isActive ? '#FFFFFF' : theme.colors.textMuted,
                    fontWeight: isActive ? '900' : '700',
                  },
                ]}
              >
                {sampleLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <CoffeeScoringPanel
        session={session}
        sessionId={sessionId}
        coffee={selectedCoffee}
        userId={userId}
        displayName={displayName}
        attributes={attributes}
        attributesById={attributesById}
        isLoadingAttributes={isLoadingAttributes}
        attributesError={attributesError}
      />
    </View>
  );
}

interface CoffeeScoringPanelProps {
  session: TastingSession | null;
  sessionId: string;
  coffee: SessionCoffee;
  userId: string;
  displayName: string;
  attributes: FlavorAttribute[];
  attributesById: Record<string, FlavorAttribute>;
  isLoadingAttributes: boolean;
  attributesError: string | null;
}

function CoffeeScoringPanel({
  session,
  sessionId,
  coffee,
  userId,
  displayName,
  attributes,
  isLoadingAttributes,
  attributesError,
}: CoffeeScoringPanelProps) {
  const { theme } = useTheme();

  const {
    selections,
    basicTastes,
    suitability,
    notes,
    setNotes,
    toggleDescriptor,
    setBasicTaste,
    setSuitability,
  } = useTasterProfile({
    sessionId,
    coffeeId: coffee.id,
    userId,
    displayName,
  });

  const selectedIntensities = useMemo(() => {
    return selections.reduce((acc, selection) => {
      acc[selection.attributeId] = selection.intensity;
      return acc;
    }, {} as Record<string, number>);
  }, [selections]);

  const coffeeDisplayName = getCoffeeDisplayName({
    coffee,
    session,
    viewerRole: 'taster',
  });

  const sampleLabel = getCoffeeSampleLabel(coffee);

  const showCoffeeMetadata = canShowCoffeeMetadata({
    session,
    viewerRole: 'taster',
  });

  const coffeeMeta = [
    coffee.origin ? `Origen: ${coffee.origin}` : null,
    coffee.variety ? `Variedad: ${coffee.variety}` : null,
    coffee.process ? `Proceso: ${coffee.process}` : null,
    coffee.harvestDate ? `Cosecha: ${coffee.harvestDate}` : null,
  ].filter(Boolean) as string[];

  const hasSelectedDescriptors = selections.length > 0;
  const showDescriptorWarning = !isLoadingAttributes && !hasSelectedDescriptors;

  return (
    <ScrollView
      style={styles.scoringContainer}
      contentContainerStyle={styles.scoringContent}
    >
      <View
        style={[
          styles.coffeeCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.sampleLabel, { color: theme.colors.textMuted }]}>
          {sampleLabel}
        </Text>

        <Text style={[styles.coffeeName, { color: theme.colors.text }]}>
          {coffeeDisplayName}
        </Text>

        {showCoffeeMetadata && coffeeMeta.length > 0 && (
          <View style={styles.metaWrap}>
            {coffeeMeta.map((item) => (
              <View
                key={item}
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.metaText,
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
              styles.description,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            {coffee.description}
          </Text>
        )}

        <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
          Selecciona descriptores de la rueda, califica los gustos básicos y la
          idoneidad del café para construir su perfil sensorial completo.
        </Text>

        {session?.isBlind && (
          <View
            style={[
              styles.blindNotice,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.blindNoticeText,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              Modo ciego activo: estás evaluando por código de muestra.
            </Text>
          </View>
        )}
      </View>

      {isLoadingAttributes && (
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            Cargando rueda de sabores...
          </Text>
        </View>
      )}

      {attributesError && (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.danger,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>
            {attributesError}
          </Text>
        </View>
      )}

      {showDescriptorWarning && (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.warningText, { color: theme.colors.textMuted }]}>
            Aún no has seleccionado descriptores. Toca la rueda para empezar a
            caracterizar el café.
          </Text>
        </View>
      )}

      {!isLoadingAttributes && !attributesError && (
        <FlavorWheel
          attributes={attributes}
          selectedIntensities={selectedIntensities}
          onChangeIntensity={toggleDescriptor}
        />
      )}

      <View
        style={[
          styles.basicTastesCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.basicTastesTitle, { color: theme.colors.text }]}>
          Gustos básicos
        </Text>

        <RatingSlider
          label="Dulce"
          value={basicTastes.sweet}
          min={BASIC_TASTE_SCALE.min}
          max={BASIC_TASTE_SCALE.max}
          onChange={(value) => setBasicTaste('sweet', value)}
        />

        <RatingSlider
          label="Ácido / agrio"
          value={basicTastes.sourAcidic}
          min={BASIC_TASTE_SCALE.min}
          max={BASIC_TASTE_SCALE.max}
          onChange={(value) => setBasicTaste('sourAcidic', value)}
        />

        <RatingSlider
          label="Amargo"
          value={basicTastes.bitter}
          min={BASIC_TASTE_SCALE.min}
          max={BASIC_TASTE_SCALE.max}
          onChange={(value) => setBasicTaste('bitter', value)}
        />
      </View>

      <View
        style={[
          styles.basicTastesCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.basicTastesTitle, { color: theme.colors.text }]}>
          Propósito
        </Text>

        <RatingSlider
          label="Idoneidad"
          value={suitability}
          min={SUITABILITY_SCALE.min}
          max={SUITABILITY_SCALE.max}
          onChange={setSuitability}
        />
      </View>

      <View
        style={[
          styles.notesCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.notesLabel, { color: theme.colors.text }]}>
          Notas adicionales
        </Text>

        <TextInput
          style={[
            styles.notesInput,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Describe textura, balance, recuerdos aromáticos o cualquier observación relevante."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  userLabel: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontWeight: '700',
  },
  coffeeSelector: {
    maxHeight: 60,
  },
  coffeeSelectorContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  coffeeChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  coffeeChipText: {
    fontSize: 14,
  },
  scoringContainer: {
    flex: 1,
  },
  scoringContent: {
    padding: 16,
    paddingBottom: 40,
  },
  coffeeCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  sampleLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coffeeName: {
    fontSize: 24,
    fontWeight: '800',
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  metaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  blindNotice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  blindNoticeText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  basicTastesCard: {
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  basicTastesTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 14,
  },
  infoBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  infoText: {
    fontWeight: '700',
  },
  warningBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  warningText: {
    fontWeight: '700',
    lineHeight: 19,
  },
  errorBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  errorText: {
    fontWeight: '700',
    lineHeight: 19,
  },
  notesCard: {
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});