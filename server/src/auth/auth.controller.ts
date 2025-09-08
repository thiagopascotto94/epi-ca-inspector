import { Request, Response } from 'express';
import { User } from '../models';
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import admin from '../config/firebase-admin';
import crypto from 'crypto';
import ms from 'ms';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_EXPIRES_IN_STRING = process.env.JWT_EXPIRES_IN || '1d';
const ROOT_USER_EMAIL = process.env.ROOT_USER_EMAIL;

// Helper to generate a local JWT
const generateLocalToken = (user: User) => {
    const payload = { id: user.id, email: user.email, role: user.role };

    // Convert the time string (e.g., '1d', '10h') to seconds for jwt.sign
    const expiresInSeconds = Math.floor(ms(JWT_EXPIRES_IN_STRING) / 1000);

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
