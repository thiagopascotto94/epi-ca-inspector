import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import sequelize from './config/database';
import authRoutes from './auth/auth.routes';
import libraryRoutes from './library/library.routes';
// import jobRoutes from './job/job.routes'; // Jobs disabled
import caRoutes from './ca/ca.routes';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/libraries', libraryRoutes);
// apiRouter.use('/jobs', jobRoutes); // Jobs disabled
apiRouter.use('/cas', caRoutes);
app.use('/api', apiRouter);

// A simple root route for health check
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
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

startServer();

export default app;
