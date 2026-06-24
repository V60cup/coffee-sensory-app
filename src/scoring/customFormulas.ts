// src/scoring/customFormulas.ts

import type {
  DescriptorSelection,
  FlavorAttribute,
  ScoringProfile,
} from '../types/domain';

export type ScoreContribution = {
  attributeId: string;
  attributeName: string;
  intensity: number;
  weight: number;
  normalizedIntensity: number;
  contribution: number;
  polarity: FlavorAttribute['polarity'];
};

export type CustomFormulaContext = {
  selections: DescriptorSelection[];
  attributesById: Record<string, FlavorAttribute>;
  profile: ScoringProfile;
  contributions: ScoreContribution[];
};

export type CustomFormula = (context: CustomFormulaContext) => number;

export const customFormulas: Record<string, CustomFormula> = {
  defectWeighted: ({ contributions }) => {
    return contributions.reduce((total, contribution) => {
      return total + contribution.contribution;
    }, 0);
  },

  balanceBoost: ({ contributions }) => {
    const baseScore = contributions.reduce((total, contribution) => {
      return total + contribution.contribution;
    }, 0);

    const balance = contributions.find((contribution) => {
      return contribution.attributeName.toLowerCase() === 'balance';
    });

    if (!balance) {
      return baseScore;
    }

    const bonus = balance.normalizedIntensity >= 0.8 ? 0.5 : 0;

    return baseScore + bonus;
  },
};