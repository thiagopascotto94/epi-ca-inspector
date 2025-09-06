import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
        console.error('Firebase Admin SDK initialization error:', error.message);
        // Do not exit the process, as the main app might not need Firebase Admin to run
        // (e.g., if only social login uses it).
    }
} else {
    console.warn('Firebase Admin SDK credentials not found. Social login will be disabled.');
}

export default admin;
