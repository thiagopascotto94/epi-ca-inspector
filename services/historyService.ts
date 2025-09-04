
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, writeBatch, where, updateDoc } from 'firebase/firestore';

export class HistoryService {
    private static getHistoryCollectionRef(uid: string) {
        return collection(db, `users/${uid}/searchHistory`);
    }

    static async getSearchHistory(uid: string): Promise<string[]> {
        if (!uid) {
            console.log("HistoryService: UID is null or undefined for getSearchHistory.");
            return [];
        }
        try {
            console.log(`HistoryService: Attempting to get search history for UID: ${uid}`);
            const q = query(this.getHistoryCollectionRef(uid), orderBy('timestamp', 'desc'), limit(10));
            const querySnapshot = await getDocs(q);
            const history = querySnapshot.docs.map(doc => doc.data().caNumber as string);
            console.log("HistoryService: Retrieved history:", history);
            return history;
        } catch (e) {
            console.error("HistoryService: Failed to load search history from Firestore", e);
            return [];
        }
    }

    static async addSearchHistory(uid: string, caNumber: string): Promise<void> {
        if (!uid) {
            console.log("HistoryService: UID is null or undefined for addSearchHistory.");
            return;
        }
        try {
            console.log(`HistoryService: Attempting to add/update search history for UID: ${uid}, CA: ${caNumber}`);

            const q = query(this.getHistoryCollectionRef(uid), where("caNumber", "==", caNumber));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // If CA number exists, update its timestamp
                querySnapshot.docs.forEach(async (doc) => {
                    await updateDoc(doc.ref, {
                        timestamp: serverTimestamp()
                    });
                });
                console.log(`HistoryService: Updated timestamp for existing CA: ${caNumber}`);
            } else {
                // If CA number does not exist, add a new document
                await addDoc(this.getHistoryCollectionRef(uid), {
                    caNumber,
                    timestamp: serverTimestamp()
                });
                console.log(`HistoryService: Added new search history entry for CA: ${caNumber}`);
            }
        } catch (e) {
             console.error("HistoryService: Failed to save/update search history to Firestore", e);
        }
    }

    static async clearSearchHistory(uid: string): Promise<void> {
        if (!uid) {
            console.log("HistoryService: UID is null or undefined for clearSearchHistory.");
            return;
        }
        try {
            console.log(`HistoryService: Clearing search history for UID: ${uid}`);
            const querySnapshot = await getDocs(this.getHistoryCollectionRef(uid));
            const batch = writeBatch(db);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log("HistoryService: Search history cleared successfully.");
        } catch (e) {
            console.error("HistoryService: Failed to clear search history from Firestore", e);
        }
    }
}
