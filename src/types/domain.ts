// src/types/domain.ts
// Tipos centrales del dominio. Este archivo es el "contrato" que comparten
// la UI, el motor de scoring y la capa de Firestore.

export type Role = 'master' | 'taster';

export type Polarity = 'positive' | 'negative' | 'neutral';

/**
 * Un atributo de sabor / descriptor seleccionable en la rueda.
 * Puede ser global (organizationId === null) o propio de una organización.
 *
 * La jerarquía (parentId) permite construir la rueda de adentro hacia afuera.
 */
export interface FlavorAttribute {
  id: string;
  organizationId: string | null;
  name: string;
  parentId: string | null;
  polarity: Polarity;
  defaultWeight: number;
  createdAt: number;
}

/**
 * Selección concreta que hace un catador: qué atributo eligió y con qué
 * intensidad.
 */
export interface DescriptorSelection {
  attributeId: string;
  intensity: number;
}

/**
 * Los tres gustos básicos que se evalúan de forma independiente a la rueda.
 */
export type BasicTasteKey = 'sweet' | 'sourAcidic' | 'bitter';

export type BasicTasteRatings = Record<BasicTasteKey, number>;

export const BASIC_TASTE_SCALE = {
  min: 0,
  max: 9,
};

export const SUITABILITY_SCALE = {
  min: 0,
  max: 9,
};

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
 * Una sesión de catación.
 *
 * archivedAt/archivedBy permiten ocultar una sesión del historial normal sin
 * borrar definitivamente sus cafés, participantes ni resultados.
 */
export interface TastingSession {
  id: string;
  name: string;
  masterId: string;
  status: SessionStatus;
  joinCode: string;
  isBlind: boolean;
  hideNamesFromMaster?: boolean;
  createdAt: number;
  closedAt?: number;
  archivedAt?: number;
  archivedBy?: string;
}

export interface SessionParticipant {
  userId: string;
  displayName: string;
  role: Role;
  joinedAt: number;
}

/**
 * Un café dentro de una sesión.
 *
 * Los campos nuevos son opcionales para mantener compatibilidad con cafés
 * creados antes de agregar trazabilidad.
 */
export interface SessionCoffee {
  id: string;
  sessionId: string;
  name: string;
  tableLabel: string;
  order: number;
  createdAt: number;

  masterId?: string;
  sessionName?: string;

  origin?: string;
  variety?: string;
  process?: string;
  harvestDate?: string;
  description?: string;
}

/**
 * La caracterización sensorial que hace UN catador para UN café.
 */
export interface TasterProfile {
  userId: string;
  displayName: string;
  sessionId: string;
  coffeeId: string;
  descriptors: DescriptorSelection[];
  basicTastes: BasicTasteRatings;
  suitability: number;
  notes?: string;
  updatedAt: number;
}

/**
 * Resultado agregado que ve el Master en el dashboard.
 */
export interface AggregatedCoffeeResult {
  coffeeId: string;
  coffeeName: string;
  tableLabel: string;
  totalTasters: number;

  topDescriptors: {
    attributeId: string;
    name: string;
    count: number;
    avgIntensity: number;
  }[];

  descriptorConsensus: {
    attributeId: string;
    name: string;
    percentage: number;
  }[];

  categorySummary: {
    categoryId: string;
    name: string;
    count: number;
    avgIntensity: number;
  }[];

  basicTastesAverage: BasicTasteRatings;
  averageSuitability: number;
}