import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ClientStats, Library } from '../types';

export class RootService {
    static async getClientsStats(): Promise<ClientStats[]> {
        try {
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            const clientsStats: ClientStats[] = [];

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;

                const librariesCollectionRef = collection(db, `users/${userId}/libraries`);
                const librariesSnapshot = await getDocs(librariesCollectionRef);
                const libraries = librariesSnapshot.docs.map(doc => doc.data() as Library);

                const documentsCount = libraries.reduce((acc, library) => acc + (library.files?.length || 0), 0);

                const searchHistoryCollectionRef = collection(db, `users/${userId}/searchHistory`);
                const searchHistorySnapshot = await getDocs(searchHistoryCollectionRef);
                const searchesCount = searchHistorySnapshot.size;

                clientsStats.push({
                    id: userId,
                    email: userData.email,
                    libraries: libraries.length,
                    documents: documentsCount,
                    searches: searchesCount,
                });
            }

            return clientsStats;
        } catch (error) {
            console.error("Failed to get client stats:", error);
            return [];
        }
    }
}
