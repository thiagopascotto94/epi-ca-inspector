import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { Job } from '../models';
// import { aiQueue } from '../config/redis';

export const createJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { type, inputData } = req.body;

        // Validate job type
        const allowedTypes = ['ANALYZE_CAS', 'SUGGEST_CONVERSION', 'FIND_SIMILAR', 'EXTRACT_TEXT'];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ message: `Invalid job type. Must be one of: ${allowedTypes.join(', ')}` });
        }

        // Create a record in the database
        const newDbJob = await Job.create({
            type,
            inputData,
            userId,
            status: 'pending', // Status will remain pending since worker is disabled
        });

        // Add the job to the queue
        // The job name in BullMQ corresponds to our 'type'
        // The job id in BullMQ will be the same as our database job id
        // await aiQueue.add(type, inputData, { jobId: newDbJob.id });

        res.status(202).json({ message: 'Job accepted (queue is disabled)', jobId: newDbJob.id });

    } catch (error) {
        console.error('Failed to create job:', error);
        res.status(500).json({ message: 'Failed to create job', error });
    }
};

export const getJobStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        // Find the job, ensuring it belongs to the authenticated user
        const job = await Job.findOne({ where: { id, userId } });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.status(200).json(job);

    } catch (error) {
        console.error('Failed to get job status:', error);
        res.status(500).json({ message: 'Failed to get job status', error });
    }
};

export const getUserJobs = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const jobs = await Job.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50 // Optional: limit the number of jobs returned
        });
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Failed to get user jobs:', error);
        res.status(500).json({ message: 'Failed to get user jobs', error });
    }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const job = await Job.findOne({ where: { id, userId } });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        await job.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Failed to delete job:', error);
        res.status(500).json({ message: 'Failed to delete job', error });
    }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const updates = req.body;

        const job = await Job.findOne({ where: { id, userId } });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Prevent updating certain fields
        delete updates.id;
        delete updates.userId;
        delete updates.inputData;

        const updatedJob = await job.update(updates);

        res.status(200).json(updatedJob);
    } catch (error) {
        console.error('Failed to update job:', error);
        res.status(500).json({ message: 'Failed to update job', error });
    }
};
