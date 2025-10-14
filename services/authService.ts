import { User as FirebaseUser } from 'firebase/auth';
import { USE_FIREBASE } from '../config';

/**
 * SIGN UP - Throws an error as it's not supported in local-only mode.
 */
export const signUp = async (email: string, password: string, displayName: string): Promise<FirebaseUser> => {
  throw new Error("La creación de cuentas con email está deshabilitada. Utiliza los perfiles locales.");
};

/**
 * SIGN IN - Throws an error as it's not supported in local-only mode.
 */
export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    throw new Error("El inicio de sesión con email está deshabilitado. Utiliza los perfiles locales.");
};

/**
 * SIGN OUT - In local mode, this simply reloads the page to go back to the profile selector.
 */
export const signOutUser = async (): Promise<void> => {
    console.log("Cambiando de perfil. Recargando la aplicación...");
    window.location.reload();
};

/**
 * Auth state listener is not used in local profile mode. Returns a no-op unsubscribe function.
 */
export const onAuthStateChangedListener = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  if (!USE_FIREBASE) {
    console.log("AUTH: El modo de perfiles locales está activo. No se utiliza el listener de Firebase.");
    callback(null); // No user from Firebase
    return () => {}; // No-op unsubscribe for local mode.
  }
  // This part will not be reached if USE_FIREBASE is false.
  // It's kept for potential future switching.
  console.error("Firebase no está configurado para ser usado, pero se intentó inicializar el listener.");
  return () => {};
};