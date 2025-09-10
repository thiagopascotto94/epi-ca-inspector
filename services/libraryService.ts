import { api } from './localApiService';
import { Library, LibraryFile } from '../types';

// Note: The 'uid' parameter is no longer needed for most functions,
// as the user's identity is determined by the JWT token sent by the api service.

export class LibraryService {

    // Regular User Libraries
    static async getLibraries(): Promise<Library[]> {
        return api.get<Library[]>('/libraries');
    }

    static async getLibrary(libraryId: string): Promise<Library | null> {
        return api.get<Library | null>(`/libraries/${libraryId}`);
    }

    static async createLibrary(libraryData: Partial<Library>): Promise<Library> {
        return api.post<Library>('/libraries', libraryData);
    }

    static async saveLibrary(libraryId: string, libraryData: Partial<Library>): Promise<Library> {
        return api.put<Library>(`/libraries/${libraryId}`, libraryData);
    }

    static async deleteLibrary(libraryId: string): Promise<void> {
        return api.delete<void>(`/libraries/${libraryId}`);
    }

    static async addFileToLibrary(libraryId: string, file: File, metadata: { id: string; name: string }): Promise<LibraryFile> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', metadata.id);
        formData.append('name', metadata.name);
        return api.post<LibraryFile>(`/libraries/${libraryId}/files`, formData);
    }

    static async updateFileInLibrary(libraryId: string, fileId: string, fileData: Partial<LibraryFile>): Promise<LibraryFile> {
        return api.put<LibraryFile>(`/libraries/${libraryId}/files/${fileId}`, fileData);
    }

    static async deleteFileFromLibrary(libraryId: string, fileId: string): Promise<void> {
        return api.delete<void>(`/libraries/${libraryId}/files/${fileId}`);
    }

    static async createBlankFileInLibrary(libraryId: string, fileData: Partial<LibraryFile>): Promise<LibraryFile> {
        return api.post<LibraryFile>(`/libraries/${libraryId}/files`, fileData);
    }

    // Library Templates (for ROOT users)
    static async getLibraryTemplates(): Promise<Library[]> {
        return api.get<Library[]>('/libraries/library-templates');
    }

    static async getLibraryTemplate(templateId: string): Promise<Library | null> {
        return api.get<Library | null>(`/libraries/library-templates/${templateId}`);
    }

    static async createLibraryTemplate(libraryData: Partial<Library>): Promise<Library> {
        return api.post<Library>('/libraries/library-templates', libraryData);
    }

    static async saveLibraryTemplate(templateId: string, libraryData: Partial<Library>): Promise<Library> {
        return api.put<Library>(`/libraries/library-templates/${templateId}`, libraryData);
    }

    static async deleteLibraryTemplate(templateId: string): Promise<void> {
        return api.delete<void>(`/libraries/library-templates/${templateId}`);
    }

    static async addFileToTemplate(templateId: string, file: File, metadata: { id: string; name: string }): Promise<LibraryFile> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', metadata.id);
        formData.append('name', metadata.name);
        return api.post<LibraryFile>(`/libraries/library-templates/${templateId}/files`, formData);
    }

    static async updateFileInTemplate(templateId: string, fileId: string, fileData: Partial<LibraryFile>): Promise<LibraryFile> {
        return api.put<LibraryFile>(`/libraries/library-templates/${templateId}/files/${fileId}`, fileData);
    }

    static async deleteFileFromTemplate(templateId: string, fileId: string): Promise<void> {
        return api.delete<void>(`/libraries/library-templates/${templateId}/files/${fileId}`);
    }

    static async createBlankFileInTemplate(templateId: string, fileData: Partial<LibraryFile>): Promise<LibraryFile> {
        return api.post<LibraryFile>(`/libraries/library-templates/${templateId}/files`, fileData);
    }

    // User actions with templates
    static async importLibraryTemplate(templateId: string): Promise<Library> {
        // This endpoint on the server will handle creating a copy of the template for the user
        return api.post<Library>(`/libraries/import-template`, { templateId });
    }
}