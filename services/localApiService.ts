import { auth } from '../firebase'; // To get the Firebase token for the initial login

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'authToken';

// Function to get the stored JWT
export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

// Function to set the JWT in local storage
export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

// Function to remove the JWT from local storage
export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

// Main function to handle API requests
const request = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.append('Content-Type', 'application/json');
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 401) {
            // JWT might be expired, try to refresh it or log the user out
            removeToken();
            // Optionally, redirect to login page
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'An unknown error occurred');
        }

        // Handle responses with no content
        if (response.status === 204) {
            return null as T;
        }

        return await response.json() as T;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Helper methods for different HTTP verbs
export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
    post: <T>(endpoint:string, body: any) => request<T>(endpoint, {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    put: <T>(endpoint: string, body: any) => request<T>(endpoint, {
        method: 'PUT',
        body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// Special function to get the current Firebase user's ID token
export const getFirebaseIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        return await currentUser.getIdToken(true); // Force refresh
    }
    return null;
};
