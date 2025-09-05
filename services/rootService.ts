import { db } from '../firebase';
import { collection, getDocs, collectionGroup, query } from 'firebase/firestore';
import { ClientStats, Library } from '../types';

export class RootService {
    static async getClientsStats(): Promise<ClientStats[]> {
        try {
            // 1. Get all users
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as { email: string } }));

            // 2. Get all libraries using a collection group query
            const librariesQuery = query(collectionGroup(db, 'libraries'));
            const librariesSnapshot = await getDocs(librariesQuery);
            const librariesByUser = new Map<string, { count: number, documents: number }>();

            librariesSnapshot.forEach(doc => {
                const library = doc.data() as Library;
                const userId = doc.ref.parent.parent?.id;
                if (userId) {
                    const userLibraries = librariesByUser.get(userId) || { count: 0, documents: 0 };
                    userLibraries.count += 1;
                    userLibraries.documents += library.files?.length || 0;
                    librariesByUser.set(userId, userLibraries);
                }
            });

            // 3. Get all search histories using a collection group query
            const searchHistoryQuery = query(collectionGroup(db, 'searchHistory'));
            const searchHistorySnapshot = await getDocs(searchHistoryQuery);
            const searchesByUser = new Map<string, number>();

            searchHistorySnapshot.forEach(doc => {
                const userId = doc.ref.parent.parent?.id;
                if (userId) {
                    const userSearches = searchesByUser.get(userId) || 0;
                    searchesByUser.set(userId, userSearches + 1);
                }
            });

            // 4. Combine the data
            const clientsStats: ClientStats[] = users.map(user => ({
                id: user.id,
                email: user.email,
                libraries: librariesByUser.get(user.id)?.count || 0,
                documents: librariesByUser.get(user.id)?.documents || 0,
                searches: searchesByUser.get(user.id) || 0,
            }));

            return clientsStats;
        } catch (error) {
            console.error("Failed to get client stats:", error);
            return [];
        }
    }
}
