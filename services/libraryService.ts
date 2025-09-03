import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { Library } from '../types';
import { encode } from 'gpt-3-encoder';

export class LibraryService {
    private static getLibraryCollectionRef(uid: string) {
        return collection(db, `users/${uid}/libraries`);
    }

    static async getLibraries(uid: string): Promise<Library[]> {
        if (!uid) return [];
        try {
            const querySnapshot = await getDocs(this.getLibraryCollectionRef(uid));
            return querySnapshot.docs.map(doc => doc.data() as Library);
        } catch (e) {
            console.error("Failed to load libraries from Firestore", e);
            return [];
        }
    }

    static async saveLibrary(uid: string, library: Library): Promise<void> {
        if (!uid) return;
        try {
            const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
            await setDoc(libDocRef, library, { merge: true });
        } catch (e) {
            console.error("Failed to save library to Firestore", e);
            throw e; // Re-throw to be handled by the caller
        }
    }

    static async deleteLibrary(uid: string, library: Library): Promise<void> {
        if (!uid) return;
        try {
            const batch = writeBatch(db);

            // Delete the library
            const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
            batch.delete(libDocRef);

            // Update the user's usage
            const usageDocRef = doc(db, `users/${uid}/usage/storage`);
            const usageSnap = await getDoc(usageDocRef);
            if (usageSnap.exists()) {
                const currentUsage = usageSnap.data() as { bytes: number, tokens: number };
                const content = library.files[0]?.content || '';
                const tokens = encode(content).length;
                const bytes = new TextEncoder().encode(content).length;

                batch.update(usageDocRef, {
                    bytes: Math.max(0, currentUsage.bytes - bytes),
                    tokens: Math.max(0, currentUsage.tokens - tokens)
                });
            }

            await batch.commit();
        } catch (e) {
            console.error("Failed to delete library and update usage", e);
            throw e;
        }
    }

    static async importLibraries(uid: string, importedLibraries: Library[]): Promise<void> {
        if (!uid || !Array.isArray(importedLibraries)) {
            console.error("Import failed: invalid data or no user.");
            return;
        }
        try {
            const batch = writeBatch(db);
            importedLibraries.forEach(lib => {
                const libDocRef = doc(this.getLibraryCollectionRef(uid), lib.id);
                batch.set(libDocRef, lib);
            });
            await batch.commit();
        } catch (e) {
            console.error("Failed to import libraries to Firestore", e);
            throw e;
        }
    }

    static async createLibrary(uid: string, library: Library, usageUpdate: { bytes: number, tokens: number }): Promise<void> {
        if (!uid) return;
        try {
            const batch = writeBatch(db);

            // Save the new library
            const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
            batch.set(libDocRef, library);

            // Update the user's usage
            const usageDocRef = doc(db, `users/${uid}/usage/storage`);
            batch.update(usageDocRef, {
                bytes: usageUpdate.bytes,
                tokens: usageUpdate.tokens
            });

            await batch.commit();
        } catch (e) {
            console.error("Failed to create library and update usage", e);
            throw e;
        }
    }

    static async updateLibrary(uid: string, library: Library, usageUpdate: { bytes: number, tokens: number }): Promise<void> {
        if (!uid) return;
        try {
            const batch = writeBatch(db);

            // Update the library
            const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
            batch.set(libDocRef, library, { merge: true });

            // Update the user's usage
            const usageDocRef = doc(db, `users/${uid}/usage/storage`);
            batch.set(usageDocRef, {
                bytes: usageUpdate.bytes,
                tokens: usageUpdate.tokens
            }, { merge: true });

            await batch.commit();
        } catch (e) {
            console.error("Failed to update library and usage", e);
            throw e;
        }
    }
}