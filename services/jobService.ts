import { api } from './localApiService';
import { SimilarityJob } from '../types';

export class JobService {
    // The 'uid' parameter is no longer needed as the user is identified by the JWT token.

    static async getAllJobs(): Promise<SimilarityJob[]> {
        try {
            return await api.get<SimilarityJob[]>('/jobs');
        } catch (e) {
            console.error("Failed to load jobs from API", e);
            return [];
        }
    }

    static async getJob(jobId: string): Promise<SimilarityJob> {
        try {
            return await api.get<SimilarityJob>(`/jobs/${jobId}`);
        } catch (e) {
            console.error(`Failed to load job ${jobId} from API`, e);
            throw e;
        }
    }

    static async createJob(jobData: Omit<SimilarityJob, 'id' | 'createdAt' | 'status'>): Promise<SimilarityJob> {
        try {
            // The server will handle setting the id, status, and createdAt timestamp.
            return await api.post<SimilarityJob>('/jobs', jobData);
        } catch (e) {
            console.error("Failed to create job via API", e);
            throw e;
        }
    }

    static async updateJob(jobId: string, updates: Partial<SimilarityJob>): Promise<SimilarityJob> {
        try {
            return await api.put<SimilarityJob>(`/jobs/${jobId}`, updates);
        } catch (e) {
            console.error(`Failed to update job ${jobId} via API`, e);
            throw e;
        }
    }

    static async deleteJob(jobId: string): Promise<void> {
        try {
            await api.delete<void>(`/jobs/${jobId}`);
        } catch (e) {
            console.error(`Failed to delete job ${jobId} via API`, e);
            throw e;
        }
    }
}