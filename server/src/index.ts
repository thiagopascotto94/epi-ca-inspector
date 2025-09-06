import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import sequelize from './config/database';
import authRoutes from './auth/auth.routes';
import libraryRoutes from './library/library.routes';
import jobRoutes from './job/job.routes';

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
apiRouter.use('/jobs', jobRoutes);

app.use('/api', apiRouter);

// A simple root route for health check
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
    try {
        await sequelize.sync(); // Using sync() for development to create tables if they don't exist. For prod, migrations are better.
        console.log('Database connection has been established and models were synchronized.');

        app.listen(Number(PORT), HOST, () => {
            console.log(`Server is listening on http://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start the server:', error);
        process.exit(1); // Exit the process with an error code
    }
};

startServer();

export default app;
