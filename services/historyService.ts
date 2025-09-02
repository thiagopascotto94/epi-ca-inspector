export class HistoryService {
    static getSearchHistory(): string[] {
        try {
            const storedHistory = localStorage.getItem('caSearchHistory');
            return storedHistory ? JSON.parse(storedHistory) : [];
        } catch (e) {
            console.error("Failed to load search history from localStorage", e);
            return [];
        }
    }

    static updateSearchHistory(caNumber: string, currentHistory: string[]): string[] {
        const newHistory = [caNumber, ...currentHistory.filter(item => item !== caNumber)].slice(0, 10);
        try {
            localStorage.setItem('caSearchHistory', JSON.stringify(newHistory));
        } catch (e) {
             console.error("Failed to save search history to localStorage", e);
        }
        return newHistory;
    }

    static clearSearchHistory(): void {
        try {
            localStorage.removeItem('caSearchHistory');
        } catch (e) {
            console.error("Failed to clear search history from localStorage", e);
        }
    }
}
