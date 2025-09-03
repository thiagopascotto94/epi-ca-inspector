import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Library } from '../types';

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

    static async deleteLibrary(uid: string, libraryId: string): Promise<void> {
        if (!uid) return;
        try {
            const libDocRef = doc(this.getLibraryCollectionRef(uid), libraryId);
            await deleteDoc(libDocRef);
        } catch (e) {
            console.error("Failed to delete library from Firestore", e);
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
}