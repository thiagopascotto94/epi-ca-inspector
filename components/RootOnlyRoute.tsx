import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RootOnlyRouteProps {
    children: React.ReactElement;
}

const RootOnlyRoute: React.FC<RootOnlyRouteProps> = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    if (!isAuthenticated() || user?.role !== 'ROOT') {
        // Redirect them to the home page if they are not a logged-in ROOT user.
        return <Navigate to="/" replace />;
    }

    return children;
};

export default RootOnlyRoute;
