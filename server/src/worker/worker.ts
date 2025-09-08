import { bootstrap, shutdown } from '../boot';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();


// --- Main Worker Logic ---
const start = async () => {
    // Bootstrap the application (e.g., start in-memory Redis)
    await bootstrap();

    // Import worker modules AFTER bootstrap has run
    const { Worker, Job } = await import('bullmq');
    const { redisConnection } = await import('../config/redis');
    const AiHandlers = await import('./ai.handler');
    const sequelize = (await import('../config/database')).default;


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

            await sequelize.models.Job.update(
                { status: 'completed', result, completedAt: new Date(), progress: 100 },
                { where: { id: job.id } }
            );
            return result;

        } catch (error: any) {
            console.error(`Job ${job.id} failed:`, error);
            await sequelize.models.Job.update(
                { status: 'failed', error: error.message || 'An unknown error occurred' },
                { where: { id: job.id } }
            );
            throw error;
        }
    };

    try {
        await sequelize.authenticate();
        console.log('Worker connected to database successfully.');

        const worker = new Worker(QUEUE_NAME, processor, {
            connection: redisConnection,
            concurrency: 5,
            limiter: { max: 10, duration: 1000 },
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

        // Graceful shutdown
        const handleShutdown = async () => {
            console.log('Shutting down worker gracefully...');
            await worker.close();
            await sequelize.close();
            await shutdown(); // Stop in-memory redis
            process.exit(0);
        };

        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);

    } catch (error) {
        console.error('Failed to start worker:', error);
        process.exit(1);
    }
};

start();
