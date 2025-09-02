import { Library } from '../types';

export class LibraryService {
    static getLibraries(): Library[] {
        try {
            const storedLibraries = localStorage.getItem('caLibraries');
            return storedLibraries ? JSON.parse(storedLibraries) : [];
        } catch (e) {
            console.error("Failed to load libraries from localStorage", e);
            return [];
        }
    }

    static saveLibrary(library: Library, currentLibraries: Library[]): Library[] {
        const index = currentLibraries.findIndex(lib => lib.id === library.id);
        const newLibraries = [...currentLibraries];
        if (index > -1) {
            newLibraries[index] = library;
        } else {
            newLibraries.push(library);
        }
        
        try {
            localStorage.setItem('caLibraries', JSON.stringify(newLibraries));
        } catch (e) {
            console.error("Failed to save libraries to localStorage", e);
        }
        return newLibraries;
    }

    static deleteLibrary(libraryId: string, currentLibraries: Library[]): Library[] {
        const newLibraries = currentLibraries.filter(lib => lib.id !== libraryId);
        try {
            localStorage.setItem('caLibraries', JSON.stringify(newLibraries));
        } catch (e) {
            console.error("Failed to save libraries to localStorage", e);
        }
        return newLibraries;
    }

    static importLibraries(importedLibraries: Library[]): Library[] {
        if (!Array.isArray(importedLibraries)) {
            console.error("Import failed: data is not an array.");
            return [];
        }
        try {
            localStorage.setItem('caLibraries', JSON.stringify(importedLibraries));
        } catch (e) {
            console.error("Failed to save imported libraries to localStorage", e);
        }
        return importedLibraries;
    }
}
