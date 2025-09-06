import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { UserAttributes } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// Extend the Express Request interface to include the user property
export interface AuthenticatedRequest extends Request {
    user?: UserAttributes;
}

export const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token is required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: 'USER' | 'ROOT' };

        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user.get();
        next();

    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const isRoot = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'ROOT') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Access is restricted to ROOT users' });
    }
};
