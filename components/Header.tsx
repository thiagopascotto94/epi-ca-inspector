import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentTextIcon, ClipboardDocumentIcon, HomeIcon, UsersIcon } from './Icon';
import { useAuth } from '../contexts/AuthContext';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isRootUser = user?.role === 'ROOT';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md z-40">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <DocumentTextIcon className="w-8 h-8 text-sky-600"/>
                    <h1 className="text-2xl font-bold text-slate-700 dark:text-gray-200">EPI CA Inspector</h1>
                </div>
                 <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            <button onClick={() => navigate('/')} className="p-2 text-slate-500 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Início">
                                <HomeIcon className="w-6 h-6"/>
                            </button>
                            <button id="library-link" onClick={() => navigate('/library')} className="p-2 text-slate-500 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Biblioteca">
                                <ClipboardDocumentIcon className="w-6 h-6"/>
                            </button>
                            {isRootUser && (
                                <button onClick={() => navigate('/client-stats')} className="p-2 text-slate-500 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Client Stats">
                                    <UsersIcon className="w-6 h-6"/>
                                </button>
                            )}
                            <button onClick={handleLogout} className="ml-4 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors">Logout</button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors">Login</button>
                            <button onClick={() => navigate('/register')} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors">Register</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};