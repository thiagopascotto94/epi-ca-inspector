import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { SimilarityJob } from '../types';

export class JobService {
    private static getJobCollectionRef(uid: string) {
        return collection(db, `users/${uid}/jobs`);
    }

    static async getAllJobs(uid: string): Promise<SimilarityJob[]> {
        if (!uid) return [];
        try {
            const q = query(this.getJobCollectionRef(uid), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimilarityJob));
        } catch (e) {
            console.error("Failed to load jobs from Firestore", e);
            return [];
        }
    }

    static async createJob(uid: string, jobData: Omit<SimilarityJob, 'id' | 'createdAt' | 'status'>): Promise<SimilarityJob> {
        if (!uid) throw new Error("UID is required to create a job.");
        const newJob: SimilarityJob = {
            id: doc(this.getJobCollectionRef(uid)).id, // Generate a new ID for the document
            ...jobData,
            status: 'pending',
            createdAt: serverTimestamp() as any, // Firestore timestamp
        };
        try {
            const jobDocRef = doc(this.getJobCollectionRef(uid), newJob.id);
            await setDoc(jobDocRef, newJob);
            return newJob;
        } catch (e) {
            console.error("Failed to create job in Firestore", e);
            throw e;
        }
    }

    static async updateJob(uid: string, jobId: string, updates: Partial<SimilarityJob>): Promise<void> {
        if (!uid) return;
        try {
            const jobDocRef = doc(this.getJobCollectionRef(uid), jobId);
            await setDoc(jobDocRef, updates, { merge: true });
        } catch (e) {
            console.error("Failed to update job in Firestore", e);
            throw e;
        }
    }

    static async deleteJob(uid: string, jobId: string): Promise<void> {
        if (!uid) return;
        try {
            const jobDocRef = doc(this.getJobCollectionRef(uid), jobId);
            await deleteDoc(jobDocRef);
        } catch (e) {
            console.error("Failed to delete job from Firestore", e);
            throw e;
        }
    }
}