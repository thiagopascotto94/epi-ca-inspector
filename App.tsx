import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';

const App: React.FC = () => {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <Header />
            <main className="container mx-auto p-4">
                <Outlet />
            </main>
        </div>
    );
};

export default App;
