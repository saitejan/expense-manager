/**
 * Firebase authentication service
 * Handles Google Sign-In and Sign-Out operations
 */

import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import { showModal } from '../../utils';

/**
 * Gets Firebase Auth instance from app
 * @param app - Firebase app instance
 * @returns Auth instance
 */
export const getFirebaseAuth = (app: FirebaseApp): Auth => {
  return getAuth(app);
};

/**
 * Signs in user with Google OAuth
 * @param auth - Firebase Auth instance
 * @param setLoading - Loading state setter
 */
export const signInWithGoogle = async (auth: Auth | null, setLoading: (loading: boolean) => void) => {
  if (!auth) return;
  setLoading(true);
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("Google Sign-In Failed:", error);
    showModal("Sign-In Failed", `Could not sign in with Google. Details: ${error.message || 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};

/**
 * Signs out current user and clears local data
 * @param auth - Firebase Auth instance
 * @param clearData - Callback to clear local state
 */
export const handleSignOut = async (
  auth: Auth | null,
  clearData: () => void
) => {
  if (!auth) return;
  try {
    await signOut(auth);
    clearData();
  } catch (error: any) {
    console.error("Sign-Out Failed:", error);
  }
};

/**
 * Sets up authentication state listener
 * @param auth - Firebase Auth instance
 * @param onAuthChange - Callback when auth state changes
 * @returns Unsubscribe function
 */
export const setupAuthStateListener = (
  auth: Auth,
  onAuthChange: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, onAuthChange);
};
