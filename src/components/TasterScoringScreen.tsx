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

import { SessionCoffee, FlavorAttribute } from '../types/domain';

import { listenToCoffees } from '../services/sessionService';

import {
  getDefaultFlavorAttributes,
  getFlavorAttributesForOrg,
  indexAttributesById,
} from '../services/flavorAttributeService';

import { DEFAULT_PROFILE_SCA_LIKE } from '../scoring/profiles/defaults';
import { useTasterScoring } from '../hooks/useTasterScoring';
import { FlavorWheel } from './FlavorWheel';

interface Props {
  sessionId: string;
  userId: string;
  displayName: string;
  /** organizationId del catador actual, si pertenece a alguna. null en el caso típico de catador invitado. */
  organizationId?: string | null;
}

export function TasterScoringScreen({
  sessionId,
  userId,
  displayName,
  organizationId = null,
}: Props) {
  const [coffees, setCoffees] = useState<SessionCoffee[]>([]);
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);

  // Estado inicial síncrono: los defaults ya están en memoria, no hace falta
  // pasar por un ciclo de "loading" para mostrarlos. Esto es lo que el catador
  // ve en el primer frame, sin esperar ningún round-trip de red.
  const [attributes, setAttributes] = useState<FlavorAttribute[]>(
    getDefaultFlavorAttributes
  );
  // Solo entra en estado "loading" cuando SÍ hay que ir a buscar descriptores
  // custom de una organización a Firestore. Sin organización, nunca se activa.
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState<string | null>(null);

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
    // Sin organización: ya tenemos los defaults desde el estado inicial,
    // no hay nada más que cargar.
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Esperando cafés...</Text>

        <Text style={styles.emptyText}>
          El Master aún no ha agregado cafés a esta sesión.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.userLabel}>Catando como: {displayName}</Text>

      <ScrollView
        horizontal
        style={styles.coffeeSelector}
        contentContainerStyle={styles.coffeeSelectorContent}
        showsHorizontalScrollIndicator={false}
      >
        {coffees.map((coffee) => (
          <Pressable
            key={coffee.id}
            style={[
              styles.coffeeChip,
              coffee.id === selectedCoffeeId && styles.coffeeChipActive,
            ]}
            onPress={() => setSelectedCoffeeId(coffee.id)}
          >
            <Text
              style={
                coffee.id === selectedCoffeeId
                  ? styles.coffeeChipTextActive
                  : styles.coffeeChipText
              }
            >
              {coffee.tableLabel}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <CoffeeScoringPanel
        key={selectedCoffee.id}
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
  sessionId,
  coffee,
  userId,
  displayName,
  attributes,
  attributesById,
  isLoadingAttributes,
  attributesError,
}: CoffeeScoringPanelProps) {
  const { selections, liveScore, notes, setNotes, toggleDescriptor } =
    useTasterScoring({
      sessionId,
      coffeeId: coffee.id,
      userId,
      displayName,
      attributesById,
      profile: DEFAULT_PROFILE_SCA_LIKE,
    });

  const selectedIntensities = useMemo(() => {
    return selections.reduce((acc, selection) => {
      acc[selection.attributeId] = selection.intensity;
      return acc;
    }, {} as Record<string, number>);
  }, [selections]);

  const hasSelectedDescriptors = selections.length > 0;
  const showDescriptorWarning = !isLoadingAttributes && !hasSelectedDescriptors;

  return (
    <ScrollView
      style={styles.scoringContainer}
      contentContainerStyle={styles.scoringContent}
    >
      <View style={styles.coffeeCard}>
        <Text style={styles.sampleLabel}>Muestra {coffee.tableLabel}</Text>

        <Text style={styles.coffeeName}>{coffee.name}</Text>

        <Text style={styles.liveScore}>
          Score en vivo: {liveScore.toFixed(2)}
        </Text>

        <Text style={styles.helperText}>
          Selecciona descriptores de la rueda para construir el perfil sensorial
          del café.
        </Text>
      </View>

      {isLoadingAttributes && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Cargando rueda de sabores...</Text>
        </View>
      )}

      {attributesError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{attributesError}</Text>
        </View>
      )}

      {showDescriptorWarning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Aún no has seleccionado descriptores. El puntaje se actualizará
            cuando selecciones al menos un atributo de sabor.
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

      <View style={styles.notesCard}>
        <Text style={styles.notesLabel}>Notas adicionales</Text>

        <TextInput
          style={styles.notesInput}
          multiline
          placeholder="Describe aroma, sabor, defectos, sensaciones o cualquier observación relevante..."
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAF7F2',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3D2B1F',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: '#7A6A5C',
    textAlign: 'center',
  },

  userLabel: {
    fontSize: 12,
    color: '#7A6A5C',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  coffeeSelector: {
    maxHeight: 60,
  },

  coffeeSelectorContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  coffeeChip: {
    backgroundColor: '#EFE7DA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },

  coffeeChipActive: {
    backgroundColor: '#6F4E37',
  },

  coffeeChipText: {
    color: '#3D2B1F',
    fontWeight: '600',
  },

  coffeeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  scoringContainer: {
    flex: 1,
  },

  scoringContent: {
    padding: 16,
    paddingBottom: 40,
  },

  coffeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE6DA',
  },

  sampleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A47148',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  coffeeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3D2B1F',
  },

  liveScore: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#6F4E37',
  },

  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#7A6A5C',
    lineHeight: 18,
  },

  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE6DA',
  },

  infoText: {
    color: '#6F4E37',
    fontWeight: '700',
  },

  warningBox: {
    backgroundColor: '#FFF6E6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8C98D',
  },

  warningText: {
    color: '#8A5A16',
    fontWeight: '700',
    lineHeight: 19,
  },

  errorBox: {
    backgroundColor: '#FDECEC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7A4A4',
  },

  errorText: {
    color: '#9E2A2B',
    fontWeight: '700',
    lineHeight: 19,
  },

  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EEE6DA',
  },

  notesLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3D2B1F',
    marginBottom: 8,
  },

  notesInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#D9CFC3',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FAF7F2',
    fontSize: 14,
  },
});