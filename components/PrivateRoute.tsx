import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
    children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated() || user?.role !== 'ROOT') {
        // Redirect them to the home page if they are not a logged-in ROOT user.
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
