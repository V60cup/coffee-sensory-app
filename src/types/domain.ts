// src/types/domain.ts
// Tipos centrales del dominio. Este archivo es el "contrato" que comparten
// la UI, el motor de scoring y la capa de Firestore.

export type Role = 'master' | 'taster';

export type Polarity = 'positive' | 'negative' | 'neutral';

/**
 * Un atributo de sabor / descriptor seleccionable en la rueda.
 * Puede ser global (organizationId === null) o propio de una organización.
 * La jerarquía (parentId) permite construir la rueda de adentro hacia afuera,
 * igual que en Coffee Rose: categorías generales en el centro, específicas en el borde.
 */
export interface FlavorAttribute {
  id: string;
  organizationId: string | null; // null = atributo default del sistema
  name: string;
  parentId: string | null; // null = nodo raíz del wheel
  polarity: Polarity;
  defaultWeight: number; // peso usado por el motor de scoring si el profile no lo sobreescribe
  createdAt: number;
}

/**
 * Selección concreta que hace un catador: qué atributo eligió y con qué intensidad.
 */
export interface DescriptorSelection {
  attributeId: string;
  intensity: number; // normalmente 1-5 o 1-10, lo define el ScoringProfile
}

/**
 * Define cómo se calcula el puntaje final a partir de las DescriptorSelection.
 * Esto es lo que permite tener "varios sistemas por defecto + extensibilidad":
 * cada organización puede tener su propio ScoringProfile.
 */
export interface ScoringProfile {
  id: string;
  organizationId: string | null; // null = perfil default del sistema (ej. "SCA clásico")
  name: string;
  description?: string;
  baselineScore: number; // ej. 80, como en SCA / Coffee Rose
  intensityScale: { min: number; max: number };
  formula: 'weighted_sum' | 'weighted_avg' | 'custom';
  // Pesos específicos por atributo para ESTE perfil (sobreescribe defaultWeight si existe)
  attributeWeights?: Record<string, number>;
  // Solo si formula === 'custom': nombre de función registrada en src/scoring/customFormulas.ts
  customFormulaRef?: string;
  createdAt: number;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: number;
}

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  organizationId: string | null;
}

export type SessionStatus = 'open' | 'closed';

/**
 * Una sesión de catación (= "flight" en la terminología de Coffee Rose).
 * Tiene un master que la crea y controla, y N participantes (tasters).
 */
export interface TastingSession {
  id: string;
  name: string;
  masterId: string;
  scoringProfileId: string;
  status: SessionStatus;
  joinCode: string; // código de 6 dígitos para unirse, estilo Kahoot (ej. "482917")
  isBlind: boolean; // si true, los tasters no ven el nombre real del café
  createdAt: number;
  closedAt?: number;
}

export interface SessionParticipant {
  userId: string;
  displayName: string;
  role: Role;
  joinedAt: number;
}

/**
 * Un café dentro de una sesión (una muestra a catar).
 */
export interface SessionCoffee {
  id: string;
  sessionId: string;
  name: string;
  tableLabel: string; // código auto-generado o manual, útil para blind cupping
  order: number;
  createdAt: number;
}

/**
 * El puntaje de UN catador para UN café dentro de una sesión.
 * Importante: es un único documento que se SOBREESCRIBE en cada cambio,
 * no se acumula historial — así el modelo es simple y barato en Firestore.
 */
export interface TasterScore {
  userId: string;
  displayName: string;
  sessionId: string;
  coffeeId: string;
  descriptors: DescriptorSelection[];
  notes?: string;
  computedScore: number; // recalculado en cliente cada vez que cambian los descriptors
  updatedAt: number;
}

/**
 * Resultado agregado que ve el Master en el dashboard: promedio entre catadores,
 * descriptores más mencionados, etc. Se calcula en cliente a partir de TasterScore[],
 * no se persiste (se deriva).
 */
export interface AggregatedCoffeeResult {
  coffeeId: string;
  coffeeName: string;
  tableLabel: string;
  averageScore: number;
  scoreByTaster: { userId: string; displayName: string; score: number }[];
  topDescriptors: { attributeId: string; name: string; count: number; avgIntensity: number }[];
}
