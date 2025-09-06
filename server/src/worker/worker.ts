import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import * as AiHandlers from './ai.handler';
import sequelize from '../config/database';

const QUEUE_NAME = 'ai-jobs';

const processor = async (job: Job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    try {
        let result;
        switch (job.name) {
            case 'ANALYZE_CAS':
                result = await AiHandlers.handleAnalyzeCAs(job);
                break;
            case 'SUGGEST_CONVERSION':
                result = await AiHandlers.handleSuggestConversion(job);
                break;
            case 'FIND_SIMILAR':
                result = await AiHandlers.handleFindSimilar(job);
                break;
            case 'EXTRACT_TEXT':
                result = await AiHandlers.handleExtractText(job);
                break;
            default:
                throw new Error(`Unknown job type: ${job.name}`);
        }

        // Update the job in the database with the result
        await sequelize.models.Job.update(
            { status: 'completed', result, completedAt: new Date(), progress: 100 },
            { where: { id: job.id } }
        );

        return result;

    } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        // Update the job in the database with the error
        await sequelize.models.Job.update(
            { status: 'failed', error: error.message || 'An unknown error occurred' },
            { where: { id: job.id } }
        );
        throw error; // Re-throw error to let BullMQ know the job failed
    }
};


const startWorker = async () => {
    try {
        await sequelize.authenticate();
        console.log('Worker connected to database successfully.');

        const worker = new Worker(QUEUE_NAME, processor, {
            connection: redisConnection,
            concurrency: 5, // Process up to 5 jobs at a time
            limiter: {
                max: 10, // Max 10 jobs
                duration: 1000, // per second
            },
        });

        worker.on('completed', (job: Job) => {
            console.log(`Job ${job.id} has completed successfully.`);
        });

        worker.on('failed', (job: Job | undefined, err: Error) => {
            if (job) {
                console.error(`Job ${job.id} has failed with error: ${err.message}`);
            } else {
                console.error(`A job has failed with error: ${err.message}`);
            }
        });

        console.log('AI Worker started and waiting for jobs...');

    } catch (error) {
        console.error('Failed to start worker:', error);
        process.exit(1);
    }
};

startWorker();
