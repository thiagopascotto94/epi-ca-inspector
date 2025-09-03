import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { AuthService } from './authService';
import { Header } from './components/Header';
import { Theme } from './types';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [theme, setTheme] = useState<Theme>('light');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = AuthService.onAuthStateChanged(user => {
            setUser(user);
            setLoadingAuth(false);
            if (!user) {
                // if the user is not logged in and not on a public page, redirect to login
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    navigate('/login');
                }
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleOpenSettings = () => {
        console.log('Opening settings...');
    };

    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    return (
        <div className={`${theme} bg-white dark:bg-slate-900 min-h-screen`}>
            <Header 
                theme={theme} 
                toggleTheme={toggleTheme} 
                onOpenSettings={handleOpenSettings} 
                user={user} 
            />
            <main className="container mx-auto p-4">
                {user ? <Dashboard uid={user.uid} /> : <Outlet />}
            </main>
        </div>
    );
};

export default App;