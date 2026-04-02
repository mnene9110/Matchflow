
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

const MAX_ACCOUNTS_PER_DEVICE = 2;

/** 
 * Persistent Guest Logic:
 * Instead of standard signInAnonymously (which is lost on sign out),
 * we create a hidden email/password account and store credentials locally.
 */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<UserCredential> {
  if (typeof window === 'undefined') return signInAnonymously(authInstance);

  // 1. Check if we have a saved recovery key for this device
  const saved = localStorage.getItem('mf_guest_recovery');
  if (saved) {
    try {
      const { email, password } = JSON.parse(saved);
      return await signInWithEmailAndPassword(authInstance, email, password);
    } catch (e) {
      console.warn("Guest recovery failed, account might be deleted. Removing stale recovery key.", e);
      localStorage.removeItem('mf_guest_recovery');
    }
  }

  // 2. Check Device Creation Limit
  // We track how many accounts have been created on this device to prevent spam.
  const creationCount = parseInt(localStorage.getItem('mf_account_limit_count') || '0', 10);
  
  if (creationCount >= MAX_ACCOUNTS_PER_DEVICE) {
    throw new Error("Device limit reached. You have already created the maximum number of accounts allowed for this device. Please sign in to an existing account.");
  }

  // 3. Create a new "Persistent Guest"
  const randomId = Math.random().toString(36).substring(2, 10);
  const email = `guest_${randomId}@matchflow.app`;
  const password = `pass_${randomId}_${Date.now()}`;
  
  try {
    const cred = await createUserWithEmailAndPassword(authInstance, email, password);
    
    // Save recovery info
    localStorage.setItem('mf_guest_recovery', JSON.stringify({ email, password }));
    
    // Increment the device counter
    localStorage.setItem('mf_account_limit_count', (creationCount + 1).toString());
    
    return cred;
  } catch (error: any) {
    console.error("Account creation failed:", error);
    throw error;
  }
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** Link an existing anonymous account to an email and password. */
export function linkAccountToEmail(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  const user = authInstance.currentUser;
  if (!user) throw new Error("No user currently signed in.");
  
  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(user, credential).then((result) => {
    // Once linked, we no longer need the guest recovery key
    localStorage.removeItem('mf_guest_recovery');
    return result;
  });
}
