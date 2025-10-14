
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { USE_FIREBASE } from '../config';

interface FirebaseServices {
    auth: Auth;
    db: Firestore;
    app: FirebaseApp;
}

export interface FirebaseInitResult {
    services: FirebaseServices | null;
    error: string | null;
    missingKeys: string[];
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

/**
 * Gets Firebase services if USE_FIREBASE flag is true and config is valid.
 * Otherwise, returns mock services for local-only mode.
 */
export const getFirebaseServices = (): FirebaseInitResult => {
    if (!USE_FIREBASE) {
        // Return mock services for local-only mode to prevent config errors.
        return {
            services: {
                auth: {} as Auth,
                db: {} as Firestore,
                app: {} as FirebaseApp,
            },
            error: null,
            missingKeys: [],
        };
    }
    
    const missingKeys = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => key.replace(/([A-Z])/g, '_$1').toUpperCase());

    if (missingKeys.length > 0) {
        return {
            services: null,
            error: 'Missing Firebase configuration keys.',
            missingKeys,
        };
    }

    try {
        let app: FirebaseApp;
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        return {
            services: { app, auth, db },
            error: null,
            missingKeys: [],
        };
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        return {
            services: null,
            error: error instanceof Error ? error.message : 'An unknown error occurred during Firebase initialization.',
            missingKeys: [],
        };
    }
};
