import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthenticatedRouteProps {
    children: React.ReactElement;
}

const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Show a loading indicator while checking auth status
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    if (!isAuthenticated()) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to. This allows us to send them back after login.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default AuthenticatedRoute;
