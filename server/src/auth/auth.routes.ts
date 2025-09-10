import { Router } from 'express';
import { register, login, socialLogin, requestPasswordReset, resetPassword } from './auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
