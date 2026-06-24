// src/services/authService.ts
//
// Dos caminos de autenticación, según el diseño acordado:
//   1. Catador invitado -> signInAnonymously(). Firebase crea un uid real
//      (request.auth.uid funciona igual en las Firestore Rules), pero sin
//      pedir email/password. Ideal para "tengo un código, quiero catar ya".
//   2. Master / usuario de organización -> Email + Password. Pensado para
//      quien quiere persistencia de su historial de sesiones entre dispositivos
//      y pertenencia a una Organization.
//
// Importante: un usuario anónimo SÍ puede "subir de categoría" más adelante
// con linkWithCredential() si decide crear una cuenta completa — lo dejamos
// como posible mejora futura, no implementado en este esqueleto.

import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppUser } from '../types/domain';

/**
 * Login anónimo para un catador invitado. Solo pide el nombre para mostrar
 * (displayName), no requiere email ni password. Se llama justo antes de
 * unirse a una sesión por código.
 */
export async function signInAsGuestTaster(displayName: string): Promise<User> {
  const credential = await signInAnonymously(auth);
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

/**
 * Registro de un nuevo Master/usuario de organización con email y password.
 * Crea también su documento en /users/{uid} con organizationId null por defecto
 * (la asignación/creación de organización se puede hacer en un paso posterior).
 */
export async function registerMasterUser(args: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, args.email, args.password);
  await updateProfile(credential.user, { displayName: args.displayName });

  const userDoc: AppUser = {
    id: credential.user.uid,
    displayName: args.displayName,
    email: args.email,
    organizationId: null,
  };
  await setDoc(doc(db, 'users', credential.user.uid), userDoc);

  return credential.user;
}

/**
 * Login de un Master/usuario ya registrado.
 */
export async function signInMasterUser(args: {
  email: string;
  password: string;
}): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, args.email, args.password);
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Lee el perfil extendido (AppUser) desde Firestore para el uid actual.
 * Devuelve null si el usuario es anónimo (no tiene doc en /users) o si
 * el doc todavía no existe.
 */
export async function getAppUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

/**
 * Suscripción al estado de autenticación. Úsalo en un hook/contexto raíz
 * para saber en todo momento si hay alguien logueado (anónimo o con cuenta)
 * y reaccionar (ej. redirigir a la pantalla de login si el usuario sale).
 */
export function listenToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
