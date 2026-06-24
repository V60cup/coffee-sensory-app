// src/services/scoreService.ts
// Escritura y lectura de puntajes. Clave de diseño: un único documento por
// (sessionId, coffeeId, userId) que se SOBREESCRIBE en cada cambio (setDoc con merge),
// en vez de crear un documento nuevo por cada click. Esto mantiene el costo de
// Firestore bajo y hace trivial el listener en vivo del Master.

import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DescriptorSelection, TasterScore } from '../types/domain';

function scoreDocRef(sessionId: string, coffeeId: string, userId: string) {
  return doc(db, 'sessions', sessionId, 'coffees', coffeeId, 'scores', userId);
}

export async function upsertTasterScore(args: {
  sessionId: string;
  coffeeId: string;
  userId: string;
  displayName: string;
  descriptors: DescriptorSelection[];
  computedScore: number;
  notes?: string;
}) {
  const ref = scoreDocRef(args.sessionId, args.coffeeId, args.userId);
  const payload: TasterScore = {
    userId: args.userId,
    displayName: args.displayName,
    sessionId: args.sessionId,
    coffeeId: args.coffeeId,
    descriptors: args.descriptors,
    computedScore: args.computedScore,
    notes: args.notes,
    updatedAt: Date.now(),
  };
  // merge: true para no pisar campos si en el futuro agregas más sub-escritura parcial
  await setDoc(ref, payload, { merge: true });
}

/**
 * Listener en vivo para TODOS los scores de un café dentro de una sesión.
 * Esto es lo que usa el Master Dashboard: no hace falta pull manual, Firestore
 * empuja los cambios apenas un catador sincroniza (incluso si escribió offline
 * y reconectó después).
 */
export function listenToCoffeeScores(
  sessionId: string,
  coffeeId: string,
  callback: (scores: TasterScore[]) => void
) {
  const scoresCol = collection(db, 'sessions', sessionId, 'coffees', coffeeId, 'scores');
  return onSnapshot(scoresCol, (snap) => {
    const scores = snap.docs.map((d) => d.data() as TasterScore);
    callback(scores);
  });
}

/**
 * Listener para el score de UN catador específico en UN café — útil para que
 * el propio catador vea su selección reflejada (ej. al reabrir la app).
 */
export function listenToOwnScore(
  sessionId: string,
  coffeeId: string,
  userId: string,
  callback: (score: TasterScore | null) => void
) {
  const ref = scoreDocRef(sessionId, coffeeId, userId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as TasterScore) : null);
  });
}
