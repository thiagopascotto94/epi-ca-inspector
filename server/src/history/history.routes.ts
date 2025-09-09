import { Router } from 'express';
import { isAuthenticated } from '../auth/auth.middleware';
import * as controller from './history.controller';

const router = Router();

router.get('/searches', isAuthenticated, controller.getSearchHistory);
router.post('/searches', isAuthenticated, controller.addSearchHistory);
router.delete('/searches', isAuthenticated, controller.clearSearchHistory);

export default router;
