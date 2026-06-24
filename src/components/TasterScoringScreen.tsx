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
}

export function TasterScoringScreen({
  sessionId,
  userId,
  displayName,
}: Props) {
  const [coffees, setCoffees] = useState<SessionCoffee[]>([]);
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<FlavorAttribute[]>([]);

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
    getFlavorAttributesForOrg(null).then(setAttributes).catch(console.error);
  }, []);

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
}

function CoffeeScoringPanel({
  sessionId,
  coffee,
  userId,
  displayName,
  attributes,
  attributesById,
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

  return (
    <ScrollView
      style={styles.scoringContainer}
      contentContainerStyle={styles.scoringContent}
    >
      <View style={styles.coffeeCard}>
        <Text style={styles.sampleLabel}>Muestra {coffee.tableLabel}</Text>

        <Text style={styles.coffeeName}>{coffee.name}</Text>

        <Text style={styles.liveScore}>Score en vivo: {liveScore.toFixed(2)}</Text>
      </View>

      <FlavorWheel
        attributes={attributes}
        selectedIntensities={selectedIntensities}
        onChangeIntensity={toggleDescriptor}
      />

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