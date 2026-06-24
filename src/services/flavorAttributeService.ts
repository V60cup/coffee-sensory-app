// src/services/flavorAttributeService.ts
// Maneja el catálogo de descriptores: los defaults del sistema (organizationId null)
// más los que cada organización define/extiende. Este es el corazón del USP:
// "definir atributos de sabor para cafés" de forma editable, no un lexicon cerrado.

import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FlavorAttribute } from '../types/domain';
import { DEFAULT_FLAVOR_ATTRIBUTES } from '../data/defaultFlavorAttributes';

const attributesCol = collection(db, 'flavorAttributes');

/**
 * Devuelve el catálogo combinado: defaults del sistema (hardcoded, no requieren
 * red) + los custom de la organización del usuario (vienen de Firestore).
 * Si organizationId es null/undefined, devuelve solo los defaults.
 */
export async function getFlavorAttributesForOrg(
  organizationId: string | null
): Promise<FlavorAttribute[]> {
  if (!organizationId) {
    return DEFAULT_FLAVOR_ATTRIBUTES;
  }
  const q = query(attributesCol, where('organizationId', '==', organizationId));
  const snap = await getDocs(q);
  const custom = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FlavorAttribute));
  return [...DEFAULT_FLAVOR_ATTRIBUTES, ...custom];
}

export async function createCustomFlavorAttribute(args: {
  organizationId: string;
  name: string;
  parentId: string | null;
  polarity: FlavorAttribute['polarity'];
  defaultWeight: number;
}) {
  const ref = await addDoc(attributesCol, {
    organizationId: args.organizationId,
    name: args.name,
    parentId: args.parentId,
    polarity: args.polarity,
    defaultWeight: args.defaultWeight,
    createdAt: Date.now(),
  });
  return ref.id;
}

/** Utilidad para indexar un array de atributos por id, formato que pide el scoring engine. */
export function indexAttributesById(
  attributes: FlavorAttribute[]
): Record<string, FlavorAttribute> {
  return attributes.reduce((acc, attr) => {
    acc[attr.id] = attr;
    return acc;
  }, {} as Record<string, FlavorAttribute>);
}
