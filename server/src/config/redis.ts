// import { Queue, Worker, ConnectionOptions } from 'bullmq';
// import dotenv from 'dotenv';

// dotenv.config();

// const redisUrl = process.env.REDIS_URL;

// if (!redisUrl) {
//     // This check is now performed in boot.ts or at runtime
//     // throw new Error('REDIS_URL environment variable is not set');
// }

// const connection: ConnectionOptions = {
//     host: new URL(redisUrl!).hostname,
//     port: Number(new URL(redisUrl!).port),
//     username: new URL(redisUrl!).username,
//     password: new URL(redisUrl!).password,
// };

// // Reusable connection for queues and workers
// export const redisConnection = connection;

// // Name for our queue
// const QUEUE_NAME = 'ai-jobs';

// // Create a new queue
// export const aiQueue = new Queue(QUEUE_NAME, { connection });

// // We will define the worker logic in a separate worker.ts file
// // For now, this file just sets up the connection and the queue.
