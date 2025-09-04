import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { AuthService } from './authService';
import { Header } from './components/Header';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { Theme, Library } from './types';
import { LibraryService } from './services/libraryService';
import { ThemeService } from './services/themeService';
const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [theme, setTheme] = useState<Theme>(ThemeService.getInitialTheme());
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; confirmText?: string; color?: string; } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
            setUser(user);
            setLoadingAuth(false);
            if (user) {
                setLibraries(await LibraryService.getLibraries(user.uid));
            } else {
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    navigate('/login');
                }
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        ThemeService.applyTheme(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleShowConfirmation = (title: string, message: string, onConfirm: () => void, options?: { confirmText?: string; color?: string }) => {
        setConfirmation({ title, message, onConfirm, ...options });
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
                user={user} 
            />
            <main className="container mx-auto p-4">
                <Outlet context={{ user }} />
            </main>
            {confirmation?.title && (
                console.log("ConfirmationDialog is attempting to render with:", confirmation),
                <ConfirmationDialog
                    isOpen={!!confirmation}
                    title={confirmation.title}
                    message={confirmation.message}
                    onConfirm={confirmation.onConfirm}
                    onCancel={() => setConfirmation(null)}
                    confirmText={confirmation.confirmText}
                    color={confirmation.color}
                />
            )}
        </div>
    );
};

export default App;
