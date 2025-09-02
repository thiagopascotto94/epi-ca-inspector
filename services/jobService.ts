import * as idb from './idbService';
import { SimilarityJob } from '../types';

export class JobService {
    static getAllJobs(): Promise<SimilarityJob[]> {
        return idb.getAllJobs();
    }

    static async deleteJob(jobId: string): Promise<void> {
        const job = await idb.getJob(jobId); // Assuming getJob exists in idbService
        if (!job) return;

        if ((job.status === 'processing' || job.status === 'pending') && navigator.serviceWorker.controller) {
             navigator.serviceWorker.controller.postMessage({
                type: 'CANCEL_SIMILARITY_JOB',
                payload: { jobId }
            });
        }
        
        await idb.deleteJob(jobId);
    }
}
