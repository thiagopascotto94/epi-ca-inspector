import { bootstrap, shutdown } from '../boot';

// Bootstrap the application (load environment variables)
// This MUST be the first line of code to run.
bootstrap();


// --- Main Worker Logic (Currently Disabled) ---
const start = async () => {
    console.log('AI Worker is currently disabled.');

    // Graceful shutdown handler to allow PM2 to manage the process
    const handleShutdown = async () => {
        console.log('Shutting down disabled worker...');
        await shutdown();
        process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    // When re-enabling, the old worker logic will be moved back here.
    // It will use dynamic imports to ensure bootstrap() runs first.
    /*
    // Import worker modules AFTER bootstrap has run
    const { Worker, Job } = await import('bullmq');
    const { redisConnection } = await import('../config/redis');
    const AiHandlers = await import('./ai.handler');
    const sequelize = (await import('../config/database')).default;
    // ... (rest of the worker logic)
    */
};

start();
