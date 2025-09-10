
import { api } from './localApiService';

// The 'uid' parameter is removed as the user is identified by the JWT token.
export class HistoryService {

    static async getSearchHistory(): Promise<string[]> {
        try {
            // The API endpoint should return a list of recent, unique CA numbers.
            const history = await api.get<string[]>('/history/searches');
            console.log("HistoryService: Retrieved history:", history);
            return history;
        } catch (e) {
            console.error("HistoryService: Failed to load search history from API", e);
            return [];
        }
    }

    static async addSearchHistory(caNumber: string): Promise<void> {
        try {
            console.log(`HistoryService: Attempting to add search history for CA: ${caNumber}`);
            await api.post<void>('/history/searches', { caNumber });
            console.log(`HistoryService: Added new search history entry for CA: ${caNumber}`);
        } catch (e) {
             console.error("HistoryService: Failed to save search history via API", e);
        }
    }

    static async clearSearchHistory(): Promise<void> {
        try {
            console.log(`HistoryService: Clearing search history.`);
            await api.delete<void>('/history/searches');
            console.log("HistoryService: Search history cleared successfully.");
        } catch (e) {
            console.error("HistoryService: Failed to clear search history via API", e);
        }
    }
}
