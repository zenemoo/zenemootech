import { verifyToken } from './rbacMiddleware.js';

export const authMiddleware = verifyToken;
export const requireAuth = verifyToken;
