// src/services/sessionService.ts

import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { Role, SessionCoffee, TastingSession } from '../types/domain';
import {
  generateUniqueJoinCode,
  releaseJoinCode,
  resolveJoinCode,
} from './joinCodeService';

const sessionsCol = collection(db, 'sessions');

function getCurrentUserId(): string {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error('No hay usuario autenticado.');
  }

  return uid;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

/**
 * Firestore no permite guardar propiedades con valor undefined.
 * Esta función elimina esas propiedades antes de addDoc/updateDoc.
 */
function removeUndefinedValues<T extends Record<string, unknown>>(
  data: T
): Record<string, unknown> {
  return Object.entries(data).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }

      return acc;
    },
    {}
  );
}

async function assertCurrentUserIsSessionMaster(
  sessionId: string
): Promise<TastingSession> {
  const currentUserId = getCurrentUserId();
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error('La sesión no existe.');
  }

  const session = {
    id: sessionSnap.id,
    ...sessionSnap.data(),
  } as TastingSession;

  if (session.masterId !== currentUserId) {
    throw new Error(
      `El usuario actual no es el master de esta sesión. masterId=${session.masterId}, currentUser=${currentUserId}`
    );
  }

  return session;
}

/**
 * Crear sesión.
 */
export async function createSession(args: {
  name: string;
  masterId: string;
  masterDisplayName: string;
  isBlind: boolean;
}): Promise<{ sessionId: string }> {
  const currentUserId = getCurrentUserId();

  const sessionRef = await addDoc(sessionsCol, {
    name: args.name,
    masterId: currentUserId,
    status: 'open',
    joinCode: '',
    isBlind: args.isBlind,
    hideNamesFromMaster: false,
    createdAt: Date.now(),
  });

  const sessionId = sessionRef.id;

  try {
    const joinCode = await generateUniqueJoinCode(sessionId);

    await updateDoc(doc(sessionsCol, sessionId), {
      joinCode,
    });
  } catch (err) {
    console.error('Error generando joinCode para la sesión:', err);
  }

  await setDoc(doc(db, 'sessions', sessionId, 'participants', currentUserId), {
    userId: currentUserId,
    displayName: args.masterDisplayName,
    role: 'master' as Role,
    joinedAt: Date.now(),
  });

  return { sessionId };
}

/**
 * Unirse mediante código.
 */
export async function joinSessionByCode(args: {
  joinCode: string;
  userId: string;
  displayName: string;
}): Promise<{ sessionId: string }> {
  const currentUserId = getCurrentUserId();
  const sessionId = await resolveJoinCode(args.joinCode);

  if (!sessionId) {
    throw new Error('El código de sesión no existe o ya expiró.');
  }

  await setDoc(doc(db, 'sessions', sessionId, 'participants', currentUserId), {
    userId: currentUserId,
    displayName: args.displayName,
    role: 'taster' as Role,
    joinedAt: Date.now(),
  });

  return { sessionId };
}

/**
 * Agregar café definitivo a la sesión.
 */
export async function addCoffeeToSession(args: {
  sessionId: string;
  name: string;
  tableLabel?: string;
  order?: number;
  origin?: string;
  variety?: string;
  process?: string;
  harvestDate?: string;
  description?: string;
  sessionName?: string;
}): Promise<string> {
  const session = await assertCurrentUserIsSessionMaster(args.sessionId);
  const currentUserId = getCurrentUserId();

  const coffeesCol = collection(db, 'sessions', args.sessionId, 'coffees');

  const coffeePayload = removeUndefinedValues({
    sessionId: args.sessionId,
    masterId: currentUserId,
    sessionName: args.sessionName ?? session.name,
    name: args.name.trim(),
    tableLabel: args.tableLabel ?? `Muestra-${Date.now().toString().slice(-4)}`,
    order: args.order ?? Date.now(),
    createdAt: Date.now(),

    origin: normalizeOptionalText(args.origin),
    variety: normalizeOptionalText(args.variety),
    process: normalizeOptionalText(args.process),
    harvestDate: normalizeOptionalText(args.harvestDate),
    description: normalizeOptionalText(args.description),
  });

  const ref = await addDoc(coffeesCol, coffeePayload);

  return ref.id;
}

/**
 * Listener de cafés de una sesión.
 */
export function listenToCoffees(
  sessionId: string,
  callback: (coffees: SessionCoffee[]) => void
) {
  const coffeesCol = collection(db, 'sessions', sessionId, 'coffees');
  const q = query(coffeesCol, orderBy('order', 'asc'));

  return onSnapshot(q, (snap) => {
    const coffees = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as SessionCoffee
    );

    callback(coffees);
  });
}

/**
 * Listar sesiones del Master.
 *
 * Es una lectura puntual, no un listener en tiempo real, para ahorrar uso de
 * Firestore en el historial.
 */
export async function listMasterSessions(
  masterId: string,
  options?: {
    includeArchived?: boolean;
  }
): Promise<TastingSession[]> {
  const currentUserId = getCurrentUserId();

  if (currentUserId !== masterId) {
    throw new Error('No puedes listar sesiones de otro usuario.');
  }

  const q = query(sessionsCol, where('masterId', '==', masterId));
  const snap = await getDocs(q);

  return snap.docs
    .map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as TastingSession
    )
    .filter((session) => {
      if (options?.includeArchived) return true;

      return !session.archivedAt;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Listar todos los cafés creados por el Master.
 *
 * Usa collectionGroup('coffees') para consultar cafés de todas las sesiones.
 * Es una lectura puntual para no mantener listeners abiertos en historial.
 */
export async function listMasterCoffees(
  masterId: string
): Promise<SessionCoffee[]> {
  const currentUserId = getCurrentUserId();

  if (currentUserId !== masterId) {
    throw new Error('No puedes listar cafés de otro usuario.');
  }

  const coffeesGroup = collectionGroup(db, 'coffees');
  const q = query(coffeesGroup, where('masterId', '==', masterId));
  const snap = await getDocs(q);

  return snap.docs
    .map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as SessionCoffee
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Actualizar configuración de modo ciego.
 */
export async function updateSessionBlindSettings(args: {
  sessionId: string;
  isBlind: boolean;
  hideNamesFromMaster: boolean;
}): Promise<void> {
  await assertCurrentUserIsSessionMaster(args.sessionId);

  const sessionRef = doc(db, 'sessions', args.sessionId);

  await updateDoc(sessionRef, {
    isBlind: args.isBlind,
    hideNamesFromMaster: args.isBlind ? args.hideNamesFromMaster : false,
  });
}

/**
 * Cerrar sesión.
 */
export async function closeSession(sessionId: string): Promise<void> {
  const session = await assertCurrentUserIsSessionMaster(sessionId);

  const sessionRef = doc(db, 'sessions', sessionId);
  const closedAt = Date.now();

  await updateDoc(sessionRef, {
    status: 'closed',
    closedAt,
  });

  if (session.joinCode) {
    releaseJoinCode(session.joinCode).catch((err) =>
      console.warn('No se pudo liberar el joinCode:', err)
    );
  }
}

/**
 * Archivar sesión.
 *
 * Archivar no elimina subcolecciones. Solo oculta la sesión del historial
 * normal y, si estaba abierta, la cierra para liberar el código.
 */
export async function archiveSession(sessionId: string): Promise<void> {
  const session = await assertCurrentUserIsSessionMaster(sessionId);
  const currentUserId = getCurrentUserId();
  const sessionRef = doc(db, 'sessions', sessionId);

  const now = Date.now();

  const updatePayload = removeUndefinedValues({
    archivedAt: now,
    archivedBy: currentUserId,
    status: session.status === 'open' ? 'closed' : undefined,
    closedAt: session.status === 'open' ? now : undefined,
  });

  await updateDoc(sessionRef, updatePayload);

  if (session.status === 'open' && session.joinCode) {
    releaseJoinCode(session.joinCode).catch((err) =>
      console.warn('No se pudo liberar el joinCode al archivar:', err)
    );
  }
}

/**
 * Listener de sesión.
 */
export function listenToSession(
  sessionId: string,
  callback: (session: TastingSession | null) => void
) {
  const sessionRef = doc(db, 'sessions', sessionId);

  return onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snap.id,
      ...snap.data(),
    } as TastingSession);
  });
}