import { bootstrap, shutdown } from './boot';

// Bootstrap the application (load environment variables)
// This MUST be the first line of code to run.
bootstrap();

import express, { Request, Response } from 'express';
import cors from 'cors';
import sequelize from './config/database';
import authRoutes from './auth/auth.routes';
import libraryRoutes from './library/library.routes';
import jobRoutes from './job/job.routes';
import historyRoutes from './history/history.routes';
import caRoutes from './ca/ca.routes';

const app = express();

// Middleware
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Increase the limit to handle larger file contents in JSON payloads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/libraries', libraryRoutes);
apiRouter.use('/jobs', jobRoutes);
apiRouter.use('/history', historyRoutes);
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
                await shutdown();
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
