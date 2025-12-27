/**
 * Firebase app initialization service
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirebaseConfig } from '../../config/firebase';

/**
 * Initializes Firebase app with environment configuration
 * @returns Firebase app instance
 * @throws Error if initialization fails
 */
export const initializeFirebaseApp = (): FirebaseApp => {
  const firebaseConfig = getFirebaseConfig();
  return initializeApp(firebaseConfig);
};

/**
 * Checks if Firebase config is fully configured
 * @returns true if at least one config value is present
 */
export const isFirebaseConfigured = (): boolean => {
  const firebaseConfig = getFirebaseConfig();
  return Object.keys(firebaseConfig).some(key => firebaseConfig[key as keyof typeof firebaseConfig]);
};
