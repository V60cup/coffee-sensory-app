// src/services/sessionService.ts

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';

import {
  Role,
  SessionCoffee,
  TastingSession,
} from '../types/domain';

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

async function assertCurrentUserIsSessionMaster(sessionId: string): Promise<void> {
  const currentUserId = getCurrentUserId();

  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error('La sesión no existe.');
  }

  const session = sessionSnap.data() as TastingSession;

  if (session.masterId !== currentUserId) {
    throw new Error(
      `El usuario actual no es el master de esta sesión. masterId=${session.masterId}, currentUser=${currentUserId}`
    );
  }
}

/**
 * Crear sesión
 */
export async function createSession(args: {
  name: string;
  masterId: string;
  masterDisplayName: string;
  scoringProfileId: string;
  isBlind: boolean;
}): Promise<{ sessionId: string }> {
  const currentUserId = getCurrentUserId();

  const sessionRef = await addDoc(sessionsCol, {
    name: args.name,
    masterId: currentUserId,
    scoringProfileId: args.scoringProfileId,
    status: 'open',
    isBlind: args.isBlind,
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

  await setDoc(
    doc(db, 'sessions', sessionId, 'participants', currentUserId),
    {
      userId: currentUserId,
      displayName: args.masterDisplayName,
      role: 'master' as Role,
      joinedAt: Date.now(),
    }
  );

  return { sessionId };
}

/**
 * Unirse mediante código
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

  await setDoc(
    doc(db, 'sessions', sessionId, 'participants', currentUserId),
    {
      userId: currentUserId,
      displayName: args.displayName,
      role: 'taster' as Role,
      joinedAt: Date.now(),
    }
  );

  return { sessionId };
}

/**
 * Agregar café
 */
export async function addCoffeeToSession(args: {
  sessionId: string;
  name: string;
  tableLabel?: string;
  order?: number;
}): Promise<string> {
  await assertCurrentUserIsSessionMaster(args.sessionId);

  const coffeesCol = collection(
    db,
    'sessions',
    args.sessionId,
    'coffees'
  );

  const ref = await addDoc(coffeesCol, {
    sessionId: args.sessionId,
    name: args.name,
    tableLabel:
      args.tableLabel ??
      `Muestra-${Date.now().toString().slice(-4)}`,
    order: args.order ?? Date.now(),
    createdAt: Date.now(),
  });

  return ref.id;
}

/**
 * Listener de cafés
 */
export function listenToCoffees(
  sessionId: string,
  callback: (coffees: SessionCoffee[]) => void
) {
  const coffeesCol = collection(
    db,
    'sessions',
    sessionId,
    'coffees'
  );

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
 * Cerrar sesión
 */
export async function closeSession(sessionId: string): Promise<void> {
  await assertCurrentUserIsSessionMaster(sessionId);

  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);

  const joinCode = snap.exists()
    ? (snap.data() as TastingSession).joinCode
    : undefined;

  await updateDoc(sessionRef, {
    status: 'closed',
    closedAt: Date.now(),
  });

  if (joinCode) {
    releaseJoinCode(joinCode).catch((err) =>
      console.warn('No se pudo liberar el joinCode:', err)
    );
  }
}

/**
 * Listener de sesión
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