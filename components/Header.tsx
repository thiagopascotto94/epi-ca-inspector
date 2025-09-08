import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog6ToothIcon, DocumentTextIcon, ClipboardDocumentIcon, HomeIcon, UsersIcon } from './Icon';
import { IS_DEV_MODE } from '../config';
import { AuthService } from '../authService';
import { User } from 'firebase/auth';
import { useIsRootUser } from '../hooks/useIsRootUser';

interface HeaderProps {
    user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
    const navigate = useNavigate();
    const isRootUser = useIsRootUser(user);

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 bg-white/80 backdrop-blur-sm shadow-md z-40">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <DocumentTextIcon className="w-8 h-8 text-sky-600"/>
                    <h1 className="text-2xl font-bold text-slate-700">EPI CA Inspector</h1>
                </div>
                 <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            <button onClick={() => navigate('/')} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors" aria-label="Início">
                                <HomeIcon className="w-6 h-6"/>
                            </button>
                            <button id="library-link" onClick={() => navigate('/library')} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors" aria-label="Biblioteca">
                                <ClipboardDocumentIcon className="w-6 h-6"/>
                            </button>
                            {isRootUser && (
                                <button onClick={() => navigate('/client-stats')} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors" aria-label="Client Stats">
                                    <UsersIcon className="w-6 h-6"/>
                                </button>
                            )}
                            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">Logout</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">Login</button>
                            <button onClick={() => navigate('/register')} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">Register</button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};