import { RedisMemoryServer } from 'redis-memory-server';

let redisServer: RedisMemoryServer | null = null;

/**
 * Starts an in-memory Redis server if the environment is 'development'
 * and sets the REDIS_URL environment variable.
 * In production, it does nothing and expects REDIS_URL to be set in the environment.
 */
export const bootstrap = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
        console.log('Development environment detected, starting in-memory Redis server...');
        try {
            redisServer = new RedisMemoryServer({
                instance: {
                    port: 6379, // Use the default Redis port
                },
            });
            await redisServer.start();
            const redisUri = redisServer.getUri();
            process.env.REDIS_URL = redisUri;
            console.log(`In-memory Redis server started at: ${redisUri}`);
        } catch (error) {
            console.error('Failed to start in-memory Redis server:', error);
            process.exit(1);
        }
    } else {
        console.log('Production or test environment detected, using REDIS_URL from environment.');
        if (!process.env.REDIS_URL) {
            console.error('FATAL: REDIS_URL environment variable is not set in production.');
            process.exit(1);
        }
    }
};

/**
 * Stops the in-memory Redis server if it was started.
 */
export const shutdown = async (): Promise<void> => {
    if (redisServer) {
        await redisServer.stop();
        console.log('In-memory Redis server stopped.');
        redisServer = null;
    }
};
