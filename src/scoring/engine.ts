// src/scoring/engine.ts

import { customFormulas, ScoreContribution } from './customFormulas';
import { normalizeIntensity } from './normalization';

import type {
  DescriptorSelection,
  FlavorAttribute,
  ScoringProfile,
} from '../types/domain';

interface ComputeScoreArgs {
  selections: DescriptorSelection[];
  attributesById: Record<string, FlavorAttribute>;
  profile: ScoringProfile;
}

function getAttributeWeight(
  attribute: FlavorAttribute,
  profile: ScoringProfile
): number {
  return profile.attributeWeights?.[attribute.id] ?? attribute.defaultWeight;
}

function buildContributions({
  selections,
  attributesById,
  profile,
}: ComputeScoreArgs): ScoreContribution[] {
  return selections
    .map((selection) => {
      const attribute = attributesById[selection.attributeId];

      if (!attribute) {
        return null;
      }

      const weight = getAttributeWeight(attribute, profile);

      const normalizedIntensity = normalizeIntensity(
        selection.intensity,
        profile.intensityScale
      );

      const polarityMultiplier = attribute.polarity === 'negative' ? -1 : 1;

      const contribution =
        normalizedIntensity * weight * polarityMultiplier;

      return {
        attributeId: attribute.id,
        attributeName: attribute.name,
        intensity: selection.intensity,
        weight,
        normalizedIntensity,
        contribution,
        polarity: attribute.polarity,
      };
    })
    .filter((item): item is ScoreContribution => item !== null);
}

function computeWeightedSum(contributions: ScoreContribution[]): number {
  return contributions.reduce((total, item) => {
    return total + item.contribution;
  }, 0);
}

function computeWeightedAverage(contributions: ScoreContribution[]): number {
  const totalWeight = contributions.reduce((total, item) => {
    return total + Math.abs(item.weight);
  }, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum = contributions.reduce((total, item) => {
    return total + item.contribution;
  }, 0);

  return weightedSum / totalWeight;
}

export function computeScore(input: ComputeScoreArgs): number {
  const { profile } = input;

  const contributions = buildContributions(input);

  let rawScore: number;

  switch (profile.formula) {
    case 'weighted_sum':
      rawScore = computeWeightedSum(contributions);
      break;

    case 'weighted_avg':
      rawScore = computeWeightedAverage(contributions);
      break;

    case 'custom': {
      if (!profile.customFormulaRef) {
        throw new Error(
          'ScoringProfile uses custom formula but customFormulaRef is missing.'
        );
      }

      const customFormula = customFormulas[profile.customFormulaRef];

      if (!customFormula) {
        throw new Error(
          `Custom scoring formula not found: ${profile.customFormulaRef}`
        );
      }

      rawScore = customFormula({
        selections: input.selections,
        attributesById: input.attributesById,
        profile,
        contributions,
      });

      break;
    }

    default:
      throw new Error(`Unsupported scoring formula: ${profile.formula}`);
  }

  return profile.baselineScore + rawScore;
}