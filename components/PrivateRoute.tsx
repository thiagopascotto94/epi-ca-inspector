import React from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { User } from 'firebase/auth';
import { useIsRootUser } from '../hooks/useIsRootUser';

interface PrivateRouteProps {
    children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { user } = useOutletContext<{ user: User | null }>();
    const isRootUser = useIsRootUser(user);

    if (!isRootUser) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
