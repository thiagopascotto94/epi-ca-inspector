import { Router } from 'express';
import { isAuthenticated } from '../auth/auth.middleware';
import * as controller from './job.controller';

const router = Router();

// Route to get all jobs for the current user
router.get('/', isAuthenticated, controller.getUserJobs);

// Route to create a new job
router.post('/', isAuthenticated, controller.createJob);

// Route to get the status of a specific job
router.get('/:id', isAuthenticated, controller.getJobStatus);

export default router;
