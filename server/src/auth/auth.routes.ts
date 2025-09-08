import { Router } from 'express';
import { register, login, socialLogin } from './auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);

export default router;
