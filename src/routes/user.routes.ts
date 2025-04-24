import express, { RequestHandler } from 'express';
import { register, login, logout, getMe } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { validateUserCredentials } from '../middleware/validation.middleware';

const router = express.Router();

router.post('/register', validateUserCredentials as RequestHandler, register as RequestHandler);
router.post('/login', validateUserCredentials as RequestHandler, login as RequestHandler);
router.post('/logout', protect as RequestHandler, logout as RequestHandler);
router.get('/me', protect as RequestHandler, getMe as RequestHandler);

export default router;