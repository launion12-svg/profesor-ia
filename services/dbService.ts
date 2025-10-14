import { openDB, IDBPDatabase } from 'idb';
import { collection, doc, getDocs, setDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import type { Course, StudySession, User, WeakPoint } from '../types';
import { USE_FIREBASE } from '../config';
import { getFirebaseServices } from './firebase';
import { getRandomAvatarColor, buildMapSourceText } from '../utils';

const APP_SCHEMA_VERSION = '4';
const SCHEMA_VER_KEY = 'app:schemaVersion';
const BACKUP_KEY = 'app:lastBackupJson';

// --- COMMON INTERFACE ---
interface DbService {
  loadUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  loadUserCourses(userId: string): Promise<Course[]>;
  createCourse(userId: string, name: string): Promise<Course>;
  saveSession(session: StudySession): Promise<void>;
  loadSessions(userId: string): Promise<StudySession[]>;
  deleteSession(sessionId: string): Promise<void>;
  saveWeakPoint(weakPoint: WeakPoint): Promise<void>;
  getWeakPoint(weakPointId: string): Promise<WeakPoint | undefined>;
  loadWeakPoints(userId: string): Promise<WeakPoint[]>;
  exportAllData(): Promise<string>;
  importAllData(jsonString: string): Promise<void>;
  closeDB(): Promise<void>;
  migrateSessionsMapSourceText(userId: string): Promise<void>;
}

// --- INDEXEDDB IMPLEMENTATION ---

const DB_NAME = 'ai-study-assistant-db';
const DB_VERSION = 4; // Version incremented for schema safety
const USER_STORE = 'users_store';
const COURSE_STORE = 'courses_store';
const SESSION_STORE = 'sessions_store';
const WEAK_POINTS_STORE = 'weak_points_store';
const ALL_STORES = [USER_STORE, COURSE_STORE, SESSION_STORE, WEAK_POINTS_STORE];


let idbPromise: Promise<IDBPDatabase> | undefined;
const initIDB = () => {
  if (idbPromise) return idbPromise;
  idbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 3 && !db.objectStoreNames.contains(USER_STORE)) {
        db.createObjectStore(USER_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(COURSE_STORE)) {
        const store = db.createObjectStore(COURSE_STORE, { keyPath: 'id' });
        store.createIndex('by-userId', 'userId');
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const store = db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        store.createIndex('by-userId', 'userId');
      }
      if (!db.objectStoreNames.contains(WEAK_POINTS_STORE)) {
        const store = db.createObjectStore(WEAK_POINTS_STORE, { keyPath: 'id' });
        store.createIndex('by-userId', 'userId');
      }
      // Future schema changes for DB_VERSION 4+ would go here.
    },
  });
  return idbPromise;
};

const indexedDbService: DbService = {
  loadUsers: async () => {
    const db = await initIDB();
    return db.getAll(USER_STORE);
  },
  saveUser: async (user) => {
    const db = await initIDB();
    await db.put(USER_STORE, user);
  },
  deleteUser: async (userId: string) => {
    const db = await initIDB();
    await db.delete(USER_STORE, userId);
  },
  loadUserCourses: async (userId) => {
    const db = await initIDB();
    const courses = await db.getAllFromIndex(COURSE_STORE, 'by-userId', userId);
    if (courses.length === 0) {
      const defaultCourse = await indexedDbService.createCourse(userId, "Asignatura General");
      return [defaultCourse];
    }
    return courses;
  },
  createCourse: async (userId, name) => {
    const db = await initIDB();
    const newCourse = { id: crypto.randomUUID(), userId, name };
    await db.add(COURSE_STORE, newCourse);
    return newCourse;
  },
  saveSession: async (session) => {
    const db = await initIDB();
    let mapSourceText = session.mapSourceText;
    if ((!mapSourceText || !mapSourceText.trim()) && Array.isArray(session.microLessons) && session.microLessons.length > 0) {
      mapSourceText = buildMapSourceText(session.microLessons);
    }
    const sessionToSave = { ...session, mapSourceText, updatedAt: new Date().toISOString() };
    await db.put(SESSION_STORE, sessionToSave);
  },
  loadSessions: async (userId) => {
    const db = await initIDB();
    const sessions = await db.getAllFromIndex(SESSION_STORE, 'by-userId', userId);
    return sessions.sort((a, b) => {
        const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
    });
  },
  deleteSession: async (sessionId) => {
    const db = await initIDB();
    await db.delete(SESSION_STORE, sessionId);
  },
  saveWeakPoint: async (weakPoint) => {
    const db = await initIDB();
    await db.put(WEAK_POINTS_STORE, weakPoint);
  },
  getWeakPoint: async (weakPointId) => {
    const db = await initIDB();
    return db.get(WEAK_POINTS_STORE, weakPointId);
  },
  loadWeakPoints: async (userId) => {
    const db = await initIDB();
    // Load all points for the user, components will filter as needed (e.g., by status)
    return db.getAllFromIndex(WEAK_POINTS_STORE, 'by-userId', userId);
  },
  exportAllData: async () => {
    const db = await initIDB();
    const data = {
        users: await db.getAll(USER_STORE),
        courses: await db.getAll(COURSE_STORE),
        sessions: await db.getAll(SESSION_STORE),
        weakPoints: await db.getAll(WEAK_POINTS_STORE),
    };
    return JSON.stringify(data, null, 2);
  },
  importAllData: async (jsonString) => {
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (e) {
        throw new Error("El archivo no es un JSON válido.");
    }
    
    const isValid = data && typeof data === 'object' &&
                    data.users && Array.isArray(data.users) &&
                    data.courses && Array.isArray(data.courses) &&
                    data.sessions && Array.isArray(data.sessions) &&
                    data.weakPoints && Array.isArray(data.weakPoints);

    if (!isValid) {
        throw new Error("El archivo JSON no tiene el formato correcto o los datos están corruptos.");
    }
    
    const db = await initIDB();
    const tx = db.transaction(ALL_STORES, 'readwrite');
    
    try {
      await Promise.all([
        tx.objectStore(USER_STORE).clear(),
        tx.objectStore(COURSE_STORE).clear(),
        tx.objectStore(SESSION_STORE).clear(),
        tx.objectStore(WEAK_POINTS_STORE).clear(),
      ]);

      await Promise.all([
        ...data.users.map((item: User) => tx.objectStore(USER_STORE).put(item)),
        ...data.courses.map((item: Course) => tx.objectStore(COURSE_STORE).put(item)),
        ...data.sessions.map((item: StudySession) => tx.objectStore(SESSION_STORE).put(item)),
        ...data.weakPoints.map((item: WeakPoint) => tx.objectStore(WEAK_POINTS_STORE).put(item)),
      ]);

      await tx.done;
    } catch (error) {
        tx.abort();
        console.error("Error during atomic import:", error);
        throw new Error("Falló la transacción de importación. No se han realizado cambios.");
    }
  },
  closeDB: async () => {
    if (!idbPromise) return;
    const db = await idbPromise;
    db.close();
    idbPromise = undefined;
  },
  migrateSessionsMapSourceText: async (userId: string) => {
    const db = await initIDB();
    const sessions = await db.getAllFromIndex(SESSION_STORE, 'by-userId', userId);

    for (const s of sessions) {
      const needsMap = (!s.mapSourceText || !s.mapSourceText.trim())
        && Array.isArray(s.microLessons) && s.microLessons.length > 0;

      if (needsMap) {
        const mapSourceText = buildMapSourceText(s.microLessons);
        const updated = { ...s, mapSourceText, updatedAt: new Date().toISOString() };
        await db.put(SESSION_STORE, updated);
      }
    }
  },
};

// --- FIRESTORE IMPLEMENTATION (Not used in this configuration) ---

const firestoreService: DbService = {
  loadUsers: async () => { throw new Error("Firestore user loading not implemented."); },
  saveUser: async (user) => { throw new Error("Firestore user saving not implemented."); },
  deleteUser: async (userId) => { throw new Error("Firestore user deletion not implemented."); },
  loadUserCourses: async (userId) => { return []; },
  createCourse: async (userId, name) => { throw new Error("Firestore course creation not implemented."); },
  saveSession: async (session) => { throw new Error("Firestore session saving not implemented."); },
  loadSessions: async (userId) => { return []; },
  deleteSession: async (sessionId) => { throw new Error("Firestore session deletion not implemented."); },
  saveWeakPoint: async (weakPoint) => { throw new Error("Firestore weak point saving not implemented."); },
  getWeakPoint: async (weakPointId) => { return undefined; },
  loadWeakPoints: async (userId) => { return []; },
  exportAllData: async () => { throw new Error("Firestore export not implemented."); },
  importAllData: async () => { throw new Error("Firestore import not implemented."); },
  closeDB: async () => { /* No-op for Firebase */ },
  migrateSessionsMapSourceText: async (userId: string) => { /* No-op for Firebase */ },
};

// --- EXPORT THE CORRECT SERVICE BASED ON THE FLAG ---
const selectedService = USE_FIREBASE ? firestoreService : indexedDbService;

export const loadUsers = selectedService.loadUsers;
export const saveUser = selectedService.saveUser;
export const deleteUser = selectedService.deleteUser;
export const loadUserCourses = selectedService.loadUserCourses;
export const createCourse = selectedService.createCourse;
export const saveSession = selectedService.saveSession;
export const loadSessions = selectedService.loadSessions;
export const deleteSession = selectedService.deleteSession;
export const saveWeakPoint = selectedService.saveWeakPoint;
export const getWeakPoint = selectedService.getWeakPoint;
export const loadWeakPoints = selectedService.loadWeakPoints;
export const exportAllData = selectedService.exportAllData;
export const importAllData = selectedService.importAllData;
export const closeDB = selectedService.closeDB;
export const migrateSessionsMapSourceText = selectedService.migrateSessionsMapSourceText;

// --- SCHEMA SAFETY UTILITY ---
export const ensureSchemaSafety = async () => {
  if (USE_FIREBASE) return; // This logic is only for IndexedDB
  const current = localStorage.getItem(SCHEMA_VER_KEY);
  if (current === APP_SCHEMA_VERSION) return;

  console.log(`[DB] Schema version mismatch. Current: ${current}, Required: ${APP_SCHEMA_VERSION}. Backing up and upgrading.`);
  
  try {
    const json = await exportAllData();
    localStorage.setItem(BACKUP_KEY, json);
    console.log('[DB] Pre-migration backup created successfully.');
  } catch (e) {
    console.warn('No se pudo crear backup previo a la migración:', e);
  }
  
  localStorage.setItem(SCHEMA_VER_KEY, APP_SCHEMA_VERSION);
};