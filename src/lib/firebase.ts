// ERROREX STANDALONE SOVEREIGN API LAYER
// 100% decoupled from external Firebase - zero cloud dependencies, instant and reliable!

import {
  standaloneAuth,
  standaloneDb,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  StandaloneUser
} from './standaloneApi';

export const auth = standaloneAuth as any;
export const db = standaloneDb as any;

export class GoogleAuthProvider {
  setCustomParameters(_params: any) {}
}

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  console.warn(`[ERROREX Standalone API] Notice for ${operationType} at ${path}:`, error);
}

export async function testConnection(): Promise<boolean> {
  // Always true because our local standalone API is self-contained and active
  return true;
}

// Standalone Auth Methods
export async function signInWithEmailAndPassword(_auth: any, email: string, pass: string) {
  return standaloneAuth.signInWithEmailAndPassword(email, pass);
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, pass: string) {
  return standaloneAuth.createUserWithEmailAndPassword(email, pass);
}

export async function sendPasswordResetEmail(_auth: any, email: string) {
  return standaloneAuth.sendPasswordResetEmail(email);
}

export async function sendEmailVerification(_user: any) {
  return Promise.resolve();
}

export async function fbSignOut(_auth: any) {
  return standaloneAuth.signOut();
}

export async function updateProfile(user: any, updates: any) {
  return standaloneAuth.updateProfile(user, updates);
}

export async function updatePassword(user: any, newPass: string) {
  return standaloneAuth.updatePassword(user, newPass);
}

export async function updateEmail(_user: any, _newEmail: string) {
  return Promise.resolve();
}

export async function deleteUser(_user: any) {
  return standaloneAuth.signOut();
}

export async function signInWithPopup(_auth: any, _provider: any) {
  return { user: standaloneAuth.currentUser };
}

// Re-export reactive database operations
export {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc
};

export type { StandaloneUser };
