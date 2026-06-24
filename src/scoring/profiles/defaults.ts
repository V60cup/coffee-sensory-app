// src/scoring/profiles/defaults.ts
// Perfiles de scoring que vienen "de fábrica" con la app. Sirven como punto de
// partida y referencia; cualquier organización puede clonarlos y ajustarlos,
// o crear uno completamente nuevo (ver ScoringProfile en domain.ts).

import { ScoringProfile } from '../../types/domain';

/**
 * Perfil simple inspirado en el enfoque CATA: cada descriptor positivo suma,
 * cada negativo resta, todos con el mismo peso salvo que se indique lo contrario.
 * Pensado para equipos que recién empiezan a catar o quieren algo sin fricción.
 */
export const DEFAULT_PROFILE_SIMPLE_CATA: ScoringProfile = {
  id: 'default_simple_cata',
  organizationId: null,
  name: 'CATA Simple (default)',
  description:
    'Suma ponderada simple: cada descriptor positivo suma y cada negativo resta según su intensidad.',
  baselineScore: 80,
  intensityScale: { min: 1, max: 5 },
  formula: 'weighted_sum',
  createdAt: Date.now(),
};

/**
 * Perfil que imita más de cerca la filosofía de Coffee Rose / SCA: escala de
 * intensidad más fina (1-10) y promedio en vez de suma directa, para que
 * describir muchos descriptores no infle el puntaje artificialmente.
 */
export const DEFAULT_PROFILE_SCA_LIKE: ScoringProfile = {
  id: 'default_sca_like',
  organizationId: null,
  name: 'SCA-like (default)',
  description:
    'Basado en promedio ponderado con escala fina de intensidad (1-10), similar en espíritu al protocolo SCA / Coffee Rose.',
  baselineScore: 80,
  intensityScale: { min: 1, max: 10 },
  formula: 'weighted_avg',
  createdAt: Date.now(),
};

/**
 * Perfil de ejemplo que usa una fórmula custom (ver customFormulas.ts),
 * para que quede claro cómo se conecta un sistema de puntaje más particular.
 */
export const DEFAULT_PROFILE_DEFECT_WEIGHTED: ScoringProfile = {
  id: 'default_defect_weighted',
  organizationId: null,
  name: 'Defectos Amplificados (ejemplo custom)',
  description:
    'Ejemplo de perfil con fórmula custom: los defectos (descriptores negativos) penalizan 1.5x más que lo que premian los positivos equivalentes.',
  baselineScore: 80,
  intensityScale: { min: 1, max: 5 },
  formula: 'custom',
  customFormulaRef: 'example_defect_weighted',
  createdAt: Date.now(),
};

export const DEFAULT_SCORING_PROFILES: ScoringProfile[] = [
  DEFAULT_PROFILE_SIMPLE_CATA,
  DEFAULT_PROFILE_SCA_LIKE,
  DEFAULT_PROFILE_DEFECT_WEIGHTED,
];
