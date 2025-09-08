import { Request, Response } from 'express';
import { User } from '../models';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Op } from 'sequelize';
import admin from '../config/firebase-admin';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_EXPIRES_IN_STRING = process.env.JWT_EXPIRES_IN || '1d';
const ROOT_USER_EMAIL = process.env.ROOT_USER_EMAIL;

/**
 * Parses a time string like '1d', '10h', '7m' into seconds.
 * @param timeString The string to parse.
 * @returns The number of seconds.
 */
const parseTimeStringToSeconds = (timeString: string): number => {
    const unit = timeString.charAt(timeString.length - 1).toLowerCase();
    const value = parseInt(timeString.slice(0, -1), 10);

    if (isNaN(value)) {
        return 86400; // Default to 1 day in seconds if format is invalid
    }

    switch (unit) {
        case 'd':
            return value * 24 * 60 * 60;
        case 'h':
            return value * 60 * 60;
        case 'm':
            return value * 60;
        case 's':
            return value;
        default:
            return 86400; // Default to 1 day
    }
};

// Helper to generate a local JWT
const generateLocalToken = (user: User) => {
    const payload = { id: user.id, email: user.email, role: user.role };

    const expiresInSeconds = parseTimeStringToSeconds(JWT_EXPIRES_IN_STRING);

    const options: SignOptions = {
        expiresIn: expiresInSeconds,
        algorithm: 'HS256',
    };
    return jwt.sign(payload, JWT_SECRET, options);
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const role = email === ROOT_USER_EMAIL ? 'ROOT' : 'USER';

        const user = await User.create({
            email,
            password,
            role,
        });

        const userResponse = { id: user.id, email: user.email, role: user.role };
        res.status(201).json({ message: 'User created successfully', user: userResponse });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error during registration' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateLocalToken(user);
        res.status(200).json({ token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
};

export const socialLogin = async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: 'Firebase ID token is required' });
        }

        if (!admin.apps.length) {
            return res.status(500).json({ message: 'Firebase Admin SDK not initialized. Social login is disabled.' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email } = decodedToken;

        if (!email) {
            return res.status(400).json({ message: 'Email not found in Firebase token.' });
        }

        let user = await User.findOne({ where: { email } });

        if (!user) {
            // User does not exist, create a new one
            const role = email === ROOT_USER_EMAIL ? 'ROOT' : 'USER';
            user = await User.create({
                email,
                // Generate a secure random password as it's required by the model, but won't be used
                password: crypto.randomBytes(32).toString('hex'),
                role,
            });
        }

        const token = generateLocalToken(user);
        res.status(200).json({ token });

    } catch (error: any) {
        console.error('Social login error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return res.status(401).json({ message: 'Invalid or expired Firebase token.' });
        }
        res.status(500).json({ message: 'Internal server error during social login' });
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Don't reveal that the user doesn't exist.
            return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await user.save();

        // In a real app, you would send an email. For now, we'll log it.
        console.log(`Password reset requested for ${email}. Token: ${resetToken}`);
        console.log(`Reset link: http://localhost:5173/reset-password?token=${resetToken}`);

        res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        user.password = password; // The hook will hash it
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
