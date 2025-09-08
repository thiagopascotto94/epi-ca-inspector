import { bootstrap, shutdown } from '../boot';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- Main Application Logic ---
const start = async () => {
    // Bootstrap the application (e.g., start in-memory Redis)
    await bootstrap();

    // Import server modules AFTER bootstrap has run
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    const sequelize = (await import('./config/database')).default;
    const authRoutes = (await import('./auth/auth.routes')).default;
    const libraryRoutes = (await import('./library/library.routes')).default;
    const jobRoutes = (await import('./job/job.routes')).default;
    const caRoutes = (await import('./ca/ca.routes')).default;

    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API Routes
    const apiRouter = express.Router();
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/libraries', libraryRoutes);
    apiRouter.use('/jobs', jobRoutes);
    apiRouter.use('/cas', caRoutes);
    app.use('/api', apiRouter);

    // A simple root route for health check
    app.get('/', (req, res) => {
        res.status(200).json({ message: 'Server is running' });
    });

    const PORT = process.env.PORT || 3001;
    const HOST = process.env.HOST || '0.0.0.0';

    try {
        await sequelize.sync();
        console.log('Database connection has been established and models were synchronized.');

        const server = app.listen(Number(PORT), HOST, () => {
            console.log(`API Server is listening on http://${HOST}:${PORT}`);
        });

        // Graceful shutdown
        const handleShutdown = async () => {
            console.log('Shutting down gracefully...');
            server.close(async () => {
                await sequelize.close();
                await shutdown(); // Stop in-memory redis
                process.exit(0);
            });
        };

        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);

    } catch (error) {
        console.error('Unable to start the server:', error);
        process.exit(1);
    }
};

start();
