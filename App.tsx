import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { AuthService } from './authService';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { Theme, Library } from './types';
import { LibraryService } from './services/libraryService';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [theme, setTheme] = useState<Theme>('light');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleOpenSettings = () => {
        setIsSettingsModalOpen(true);
    };

    const handleCloseSettings = () => {
        setIsSettingsModalOpen(false);
    };

    const handleShowConfirmation = (title: string, message: string, onConfirm: () => void, options?: { confirmText?: string; color?: string }) => {
        setConfirmation({ title, message, onConfirm, ...options });
    };

    const handleSaveLibrary = async (library: Library) => {
        if (!user) return;
        await LibraryService.saveLibrary(user.uid, library);
        setLibraries(await LibraryService.getLibraries(user.uid));
    };

    const handleDeleteLibrary = async (libraryId: string) => {
        console.log("libraryId", libraryId);
        if (!user.uid) return;
        console.log("user", user);
        handleShowConfirmation('Excluir Biblioteca', 'Tem certeza que deseja excluir esta biblioteca?', async () => {
            console.log("teste")
            await LibraryService.deleteLibrary(user.uid, libraryId);
            setLibraries(await LibraryService.getLibraries(user.uid));
            setConfirmation(null);
        }, { confirmText: 'Excluir', color: 'bg-red-600 hover:bg-red-700' });
    };

    const handleImportLibraries = async (importedLibraries: Library[]) => {
        if (!user) return;
        await LibraryService.importLibraries(user.uid, importedLibraries);
        setLibraries(await LibraryService.getLibraries(user.uid));
        setConfirmation(null);
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
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={handleCloseSettings}
                libraries={libraries}
                onSaveLibrary={handleSaveLibrary}
                onDeleteLibrary={handleDeleteLibrary}
                onImportLibraries={handleImportLibraries}
                onShowConfirmation={handleShowConfirmation}
            />
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
