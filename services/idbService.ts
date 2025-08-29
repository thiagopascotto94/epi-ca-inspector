
import { SimilarityJob } from '../types';

const DB_NAME = 'EPICAInspectorDB';
const DB_VERSION = 1;
const JOBS_STORE_NAME = 'similarityJobs';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening DB');
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(JOBS_STORE_NAME)) {
                db.createObjectStore(JOBS_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
    return dbPromise;
};

export const addJob = async (job: SimilarityJob): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(JOBS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(JOBS_STORE_NAME);
    store.add(job);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getJob = async (id: string): Promise<SimilarityJob | undefined> => {
    const db = await getDb();
    const tx = db.transaction(JOBS_STORE_NAME, 'readonly');
    const store = tx.objectStore(JOBS_STORE_NAME);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};


export const getAllJobs = async (): Promise<SimilarityJob[]> => {
    const db = await getDb();
    const tx = db.transaction(JOBS_STORE_NAME, 'readonly');
    const store = tx.objectStore(JOBS_STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            // Sort by creation date, newest first
            resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateJob = async (job: SimilarityJob): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(JOBS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(JOBS_STORE_NAME);
    store.put(job);
     return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};


export const deleteJob = async (id: string): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(JOBS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(JOBS_STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
