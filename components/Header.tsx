import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog6ToothIcon, DocumentTextIcon } from './Icon';
import { ThemeSwitcher } from './ThemeSwitcher';
import { IS_DEV_MODE } from '../config';
import { Theme } from '../types';
import { AuthService } from '../authService';
import { User } from 'firebase/auth';

interface HeaderProps {
    theme: Theme;
    toggleTheme: () => void;
    onOpenSettings: () => void;
    user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onOpenSettings, user }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-md z-40 dark:border-b dark:border-slate-800">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <DocumentTextIcon className="w-8 h-8 text-sky-600 dark:text-sky-500"/>
                    <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">EPI CA Inspector</h1>
                </div>
                 <div className="flex items-center gap-2">
                    <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
                    {IS_DEV_MODE && (
                        <button onClick={onOpenSettings} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors" aria-label="Configurações">
                            <Cog6ToothIcon className="w-6 h-6"/>
                        </button>
                    )}
                    {user ? (
                        <button onClick={handleLogout} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">Logout</button>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">Login</button>
                            <button onClick={() => navigate('/register')} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">Register</button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};