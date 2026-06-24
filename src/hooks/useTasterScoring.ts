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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(persist, debounceMs);

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