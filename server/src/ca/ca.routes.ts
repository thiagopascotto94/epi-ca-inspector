import { Router } from 'express';
import { isAuthenticated } from '../auth/auth.middleware';
import * as controller from './ca.controller';

const router = Router();

// Route to get CA data, with caching logic
router.get('/:caNumber', isAuthenticated, controller.getCaByNumber);

export default router;
