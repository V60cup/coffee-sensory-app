// src/hooks/useTasterScoring.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DescriptorSelection,
  FlavorAttribute,
  ScoringProfile,
} from '../types/domain';

import { computeScore } from '../scoring/engine';
import { upsertTasterScore } from '../services/scoreService';

interface UseTasterScoringArgs {
  sessionId: string;
  coffeeId: string;
  userId: string;
  displayName: string;
  attributesById: Record<string, FlavorAttribute>;
  profile: ScoringProfile;
  initialSelections?: DescriptorSelection[];
  debounceMs?: number;
}

export function useTasterScoring({
  sessionId,
  coffeeId,
  userId,
  displayName,
  attributesById,
  profile,
  initialSelections = [],
  debounceMs = 600,
}: UseTasterScoringArgs) {
  const [selections, setSelections] =
    useState<DescriptorSelection[]>(initialSelections);

  const [notes, setNotes] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita que el efecto de persistencia dispare una escritura en el montaje
  // inicial (cuando selections === initialSelections, no hay nada nuevo que
  // guardar). Esto eliminaba una escritura de red "gratis" cada vez que el
  // catador cambiaba de café, antes de tocar nada.
  const isFirstRender = useRef(true);

  const liveScore = useMemo(() => {
    return computeScore({
      selections,
      attributesById,
      profile,
    });
  }, [selections, attributesById, profile]);

  const persist = useCallback(() => {
    upsertTasterScore({
      sessionId,
      coffeeId,
      userId,
      displayName,
      descriptors: selections,
      computedScore: liveScore,
      notes,
    }).catch((err) => {
      console.warn(
        'No se pudo guardar el score:',
        err
      );
    });
  }, [
    sessionId,
    coffeeId,
    userId,
    displayName,
    selections,
    liveScore,
    notes,
  ]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // La primera selección de la sesión de catación para este café se guarda
    // de inmediato (sin esperar el debounce): así el Master ve aparecer al
    // catador en el dashboard en vivo sin demora perceptible. Los cambios
    // siguientes (ajustar intensidad, agregar más descriptores) sí usan
    // debounce para no saturar Firestore con cada toque.
    const isFirstSelection = selections.length === 1 && notes === '';

    if (isFirstSelection) {
      persist();
    } else {
      debounceRef.current = setTimeout(persist, debounceMs);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [persist, debounceMs]);

  const toggleDescriptor = useCallback((attributeId: string, intensity: number) => {
    setSelections((prev) => {
      const exists = prev.find((selection) => {
        return selection.attributeId === attributeId;
      });

      if (exists) {
        if (intensity <= 0) {
          return prev.filter((selection) => {
            return selection.attributeId !== attributeId;
          });
        }

        return prev.map((selection) => {
          if (selection.attributeId === attributeId) {
            return {
              ...selection,
              intensity,
            };
          }

          return selection;
        });
      }

      if (intensity <= 0) {
        return prev;
      }

      return [
        ...prev,
        {
          attributeId,
          intensity,
        },
      ];
    });
  }, []);

  return {
    selections,
    liveScore,
    notes,
    setNotes,
    toggleDescriptor,
  };
}