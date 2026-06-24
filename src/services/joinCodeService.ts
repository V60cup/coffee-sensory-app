// src/services/joinCodeService.ts
//
// Capa dedicada al patrón "código corto estilo Kahoot". Vive separada de
// sessionService.ts porque tiene una responsabilidad muy específica: generar
// un código de 6 dígitos ÚNICO entre las sesiones abiertas, resolverlo a un
// sessionId real, y liberarlo cuando la sesión se cierra (para que el código
// pueda reutilizarse más adelante sin chocar con sesiones viejas).
//
// Estructura en Firestore:
//   joinCodes/{code}  ->  { sessionId, createdAt }
//   sessions/{id}.joinCode  ->  el mismo código, para mostrarlo fácil en la UI del Master
//
// La unicidad se garantiza con `runTransaction`: intentamos crear
// joinCodes/{code} y si ya existe, generamos otro código y reintentamos.
// Esto es más simple y más barato que hacer una query `where(joinCode == X)`.

import {
  doc,
  getDoc,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const MAX_ATTEMPTS = 8;

function generateSixDigitCode(): string {
  // Evitamos códigos que empiecen en 0 para que siempre se vea/lea como "6 dígitos"
  // de forma natural (ej. nunca "012345"); esto es solo estético, no afecta unicidad.
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Genera un joinCode único y crea el documento índice joinCodes/{code} -> sessionId.
 * Se llama justo después de crear la sesión en sessionService.createSession().
 */
export async function generateUniqueJoinCode(sessionId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateSixDigitCode();
    const codeRef = doc(db, 'joinCodes', code);

    try {
      const created = await runTransaction(db, async (tx) => {
        const existing = await tx.get(codeRef);
        if (existing.exists()) {
          // Colisión: alguien más tiene este código activo. Reintentar con otro.
          return false;
        }
        tx.set(codeRef, { sessionId, createdAt: Date.now() });
        return true;
      });

      if (created) return code;
    } catch (err) {
      console.warn('Intento de generar joinCode falló, reintentando…', err);
    }
  }

  throw new Error(
    `No se pudo generar un código único de sesión después de ${MAX_ATTEMPTS} intentos.`
  );
}

/**
 * Resuelve un código de 6 dígitos al sessionId real. Devuelve null si el
 * código no existe o ya expiró (sesión cerrada -> código liberado).
 */
export async function resolveJoinCode(code: string): Promise<string | null> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return null; // formato inválido, ni vale la pena consultar Firestore
  }
  const codeRef = doc(db, 'joinCodes', trimmed);
  const snap = await getDoc(codeRef);
  if (!snap.exists()) return null;
  return (snap.data() as { sessionId: string }).sessionId;
}

/**
 * Libera el código cuando la sesión se cierra, para que pueda reutilizarse.
 * Se llama desde sessionService.closeSession().
 */
export async function releaseJoinCode(code: string): Promise<void> {
  await deleteDoc(doc(db, 'joinCodes', code));
}
