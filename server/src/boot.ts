import dotenv from 'dotenv';
import path from 'path';

/**
 * This function should be called at the very beginning of the application's
 * entry point. It handles loading environment variables from the correct file.
 */
export const bootstrap = (): void => {
    const envPath = path.resolve(__dirname, '../../.env.local');
    const result = dotenv.config({ path: envPath });

    if (result.error) {
        // This is not a fatal error in development if the file doesn't exist,
        // but it's good to be aware of it.
        console.warn(`Warning: Could not load .env.local file from ${envPath}.`);
        console.warn('Ensure the file exists or all environment variables are set externally.');
    } else {
        console.log(`Environment variables loaded from ${envPath}`);
    }

    // Redis logic is currently disabled.
    // When re-enabling, the logic to start redis-memory-server would go here.
};

/**
 * Handles graceful shutdown logic. Currently empty as Redis is disabled.
 */
export const shutdown = async (): Promise<void> => {
    // Logic to stop in-memory redis would go here.
};
