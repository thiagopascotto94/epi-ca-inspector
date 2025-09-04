import { User } from 'firebase/auth';

const rootUserEmails = [
    'thiagopascotto94@outlook.com',
    // Add other root user emails here in the future
];

export const useIsRootUser = (user: User | null): boolean => {
    if (!user || !user.email) {
        return false;
    }
    return rootUserEmails.includes(user.email);
};
