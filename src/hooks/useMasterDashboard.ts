// src/hooks/useMasterDashboard.ts

import { useEffect, useMemo, useState } from 'react';

import {
  AggregatedCoffeeResult,
  FlavorAttribute,
  SessionCoffee,
  TasterScore,
} from '../types/domain';

import { listenToCoffeeScores } from '../services/scoreService';

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function aggregate(
  coffee: SessionCoffee,
  scores: TasterScore[],
  attributesById: Record<string, FlavorAttribute>
): AggregatedCoffeeResult {
  const averageScore =
    scores.length === 0
      ? 0
      : roundTwo(
          scores.reduce((sum, score) => sum + score.computedScore, 0) /
            scores.length
        );

  const scoreByTaster = scores
    .map((score) => ({
      userId: score.userId,
      displayName: score.displayName,
      score: score.computedScore,
    }))
    .sort((a, b) => b.score - a.score);

  const descriptorTally: Record<
    string,
    {
      count: number;
      intensitySum: number;
    }
  > = {};

  for (const score of scores) {
    for (const selection of score.descriptors) {
      if (!descriptorTally[selection.attributeId]) {
        descriptorTally[selection.attributeId] = {
          count: 0,
          intensitySum: 0,
        };
      }

      descriptorTally[selection.attributeId].count += 1;
      descriptorTally[selection.attributeId].intensitySum += selection.intensity;
    }
  }

  const topDescriptors = Object.entries(descriptorTally)
    .map(([attributeId, value]) => {
      const avgIntensity =
        value.count === 0 ? 0 : roundTwo(value.intensitySum / value.count);

      return {
        attributeId,
        name: attributesById[attributeId]?.name ?? attributeId,
        count: value.count,
        avgIntensity,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return b.avgIntensity - a.avgIntensity;
    })
    .slice(0, 8);

  return {
    coffeeId: coffee.id,
    coffeeName: coffee.name,
    tableLabel: coffee.tableLabel,
    averageScore,
    scoreByTaster,
    topDescriptors,
  };
}

export function useCoffeeDashboard(
  sessionId: string,
  coffee: SessionCoffee | null,
  attributesById: Record<string, FlavorAttribute>
) {
  const [scores, setScores] = useState<TasterScore[]>([]);

  useEffect(() => {
    if (!coffee) {
      setScores([]);
      return;
    }

    const unsubscribe = listenToCoffeeScores(sessionId, coffee.id, setScores);

    return unsubscribe;
  }, [sessionId, coffee?.id]);

  const result = useMemo(() => {
    if (!coffee) {
      return null;
    }

    return aggregate(coffee, scores, attributesById);
  }, [coffee, scores, attributesById]);

  const kpis = useMemo(() => {
    const totalTasters = scores.length;

    const totalDescriptorMentions = scores.reduce((sum, score) => {
      return sum + score.descriptors.length;
    }, 0);

    const averageDescriptorsPerTaster =
      totalTasters === 0
        ? 0
        : roundTwo(totalDescriptorMentions / totalTasters);

    return {
      totalTasters,
      totalDescriptorMentions,
      averageDescriptorsPerTaster,
      averageScore: result?.averageScore ?? 0,
    };
  }, [scores, result]);

  return {
    result,
    rawScores: scores,
    kpis,
  };
}