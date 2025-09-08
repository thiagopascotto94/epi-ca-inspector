import { api } from './localApiService';
import { ClientStats } from '../types';

export class RootService {
    /**
     * Fetches client statistics from the backend.
     * This is an admin-only operation.
     */
    static async getClientsStats(): Promise<ClientStats[]> {
        try {
            // The backend will handle the aggregation of data.
            // The request is authenticated by the JWT, which should belong to a ROOT user.
            const stats = await api.get<ClientStats[]>('/stats/clients');
            return stats;
        } catch (error) {
            console.error("Failed to get client stats:", error);
            // Return an empty array or re-throw, depending on how the caller should handle errors.
            return [];
        }
    }
}
