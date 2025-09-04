import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Library, LibraryFile } from '../types';

export class LibraryService {
    private static getLibraryCollectionRef(uid: string) {
        return collection(db, `users/${uid}/libraries`);
    }

    private static getLibraryTemplatesCollectionRef() {
        return collection(db, 'library_templates');
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

    static async getLibraryTemplates(): Promise<Library[]> {
        try {
            const querySnapshot = await getDocs(this.getLibraryTemplatesCollectionRef());
            return querySnapshot.docs.map(doc => doc.data() as Library);
        } catch (e) {
            console.error("Failed to load library templates from Firestore", e);
            return [];
        }
    }

    static async getLibrary(uid: string, libraryId: string): Promise<Library | null> {
        if (!uid || !libraryId) return null;
        try {
            const libDocRef = doc(db, `users/${uid}/libraries`, libraryId);
            const docSnap = await getDoc(libDocRef);
            if (docSnap.exists()) {
                return docSnap.data() as Library;
            }
            return null;
        } catch (e) {
            console.error("Failed to load library from Firestore", e);
            return null;
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
            const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
            await deleteDoc(libDocRef);
        } catch (e) {
            console.error("Failed to delete library", e);
            throw e;
        }
    }

    static async updateLibraryFromTemplate(uid: string, library: Library, template: Library): Promise<void> {
        if (!uid) return;
        try {
            const updatedLibrary = { ...library, files: template.files };
            const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
            await setDoc(libDocRef, updatedLibrary);
        } catch (e) {
            console.error("Failed to update library from template", e);
            throw e;
        }
    }


    static async createLibrary(uid: string, library: Library, isTemplate: boolean = false): Promise<void> {
        if (isTemplate) {
            try {
                const libDocRef = doc(this.getLibraryTemplatesCollectionRef(), library.id);
                await setDoc(libDocRef, library);
            } catch (e) {
                console.error("Failed to create library template", e);
                throw e;
            }
        } else {
            if (!uid) return;
            try {
                const libDocRef = doc(this.getLibraryCollectionRef(uid), library.id);
                await setDoc(libDocRef, library);
            } catch (e) {
                console.error("Failed to create library", e);
                throw e;
            }
        }
    }

    static async deleteLibraryTemplate(templateId: string): Promise<void> {
        try {
            const libDocRef = doc(this.getLibraryTemplatesCollectionRef(), templateId);
            await deleteDoc(libDocRef);
        } catch (e) {
            console.error("Failed to delete library template", e);
            throw e;
        }
    }

    static async importLibraryTemplate(uid: string, template: Library): Promise<void> {
        if (!uid) return;
        try {
            const newLibrary = { ...template, id: template.id, systemModelId: template.id };
            const libDocRef = doc(this.getLibraryCollectionRef(uid), newLibrary.id);
            await setDoc(libDocRef, newLibrary);
        } catch (e) {
            console.error("Failed to import library template", e);
            throw e;
        }
    }

    static async addFileToLibrary(uid: string, libraryId: string, file: LibraryFile): Promise<void> {
        if (!uid || !libraryId) return;
        try {
            const libDocRef = doc(db, `users/${uid}/libraries`, libraryId);
            await updateDoc(libDocRef, {
                files: arrayUnion(file)
            });
        } catch (e) {
            console.error("Failed to add file to library", e);
            throw e;
        }
    }

    static async updateFileInLibrary(uid: string, libraryId: string, updatedFile: LibraryFile): Promise<void> {
        if (!uid || !libraryId) return;
        try {
            const libDocRef = doc(db, `users/${uid}/libraries`, libraryId);
            const library = await this.getLibrary(uid, libraryId);
            if (library) {
                const updatedFiles = library.files.map(file =>
                    file.id === updatedFile.id ? updatedFile : file
                );
                await updateDoc(libDocRef, { files: updatedFiles });
            }
        } catch (e) {
            console.error("Failed to update file in library", e);
            throw e;
        }
    }

    static async deleteFileFromLibrary(uid: string, libraryId: string, fileId: string): Promise<void> {
        if (!uid || !libraryId) return;
        try {
            const libDocRef = doc(db, `users/${uid}/libraries`, libraryId);
            const library = await this.getLibrary(uid, libraryId);
            if (library) {
                const updatedFiles = library.files.filter(file => file.id !== fileId);
                await updateDoc(libDocRef, { files: updatedFiles });
            }
        } catch (e) {
            console.error("Failed to delete file from library", e);
            throw e;
        }
    }
}