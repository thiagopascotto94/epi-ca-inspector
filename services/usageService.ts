import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const USER_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024; // 1MB
const USER_TOKEN_LIMIT = 900 * 1000; // 900k tokens

export interface UserUsage {
    bytes: number;
    tokens: number;
}

export class UsageService {
    private static getUsageDocRef(uid: string) {
        return doc(db, `users/${uid}/usage/storage`);
    }

    static async getUsage(uid: string): Promise<UserUsage> {
        if (!uid) return { bytes: 0, tokens: 0 };
        try {
            const docSnap = await getDoc(this.getUsageDocRef(uid));
            if (docSnap.exists()) {
                return docSnap.data() as UserUsage;
            }
            return { bytes: 0, tokens: 0 };
        } catch (e) {
            console.error("Failed to get user usage", e);
            return { bytes: 0, tokens: 0 };
        }
    }

    static async updateUsage(uid: string, usage: UserUsage): Promise<void> {
        if (!uid) return;
        try {
            await setDoc(this.getUsageDocRef(uid), usage);
        } catch (e) {
            console.error("Failed to update user usage", e);
            throw e;
        }
    }

    static async hasEnoughSpace(uid: string, newBytes: number, newTokens: number): Promise<boolean> {
        const currentUsage = await this.getUsage(uid);
        const totalBytes = currentUsage.bytes + newBytes;
        const totalTokens = currentUsage.tokens + newTokens;

        return totalBytes <= USER_STORAGE_LIMIT_BYTES && totalTokens <= USER_TOKEN_LIMIT;
    }
}
