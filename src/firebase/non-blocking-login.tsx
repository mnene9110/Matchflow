
'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  UserCredential,
} from 'firebase/auth';

export async function initiateAnonymousSignIn(authInstance: Auth): Promise<UserCredential> {
  if (typeof window === 'undefined') return signInAnonymously(authInstance);

  const STORAGE_KEY = 'mf_persistent_guest';
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const { email, password } = JSON.parse(saved);
      return await signInWithEmailAndPassword(authInstance, email, password);
    } catch (e) {
      console.warn("Guest recovery failed, creating new account.", e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const randomId = Math.random().toString(36).substring(2, 10);
  const email = `guest_${randomId}@matchflow.app`;
  const password = `pass_${randomId}_${Date.now()}`;
  
  try {
    const cred = await createUserWithEmailAndPassword(authInstance, email, password);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
    return cred;
  } catch (error: any) {
    console.error("Persistent Guest creation failed:", error);
    throw error;
  }
}

export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(authInstance, email, password);
}

export function linkAccountToEmail(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  const user = authInstance.currentUser;
  if (!user) throw new Error("No user currently signed in.");
  
  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(user, credential).then((result) => {
    localStorage.removeItem('mf_persistent_guest');
    return result;
  });
}
