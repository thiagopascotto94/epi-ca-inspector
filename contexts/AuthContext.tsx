import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials } from '../types';
import { AuthService } from '../authService';
import { getToken, removeToken } from '../services/localApiService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  register: (credentials: LoginCredentials) => Promise<any>;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = getToken();
      if (token) {
        try {
          const decodedUser = AuthService.decodeToken(token);
          setUser(decodedUser);
        } catch (error) {
          console.error("Invalid token found, removing it.", error);
          removeToken();
        }
      }
      setLoading(false);
    };

    validateToken();

    // Also listen to Firebase auth changes for social logins
    const unsubscribe = AuthService.onAuthStateChanged(firebaseUser => {
      if (!firebaseUser && !getToken()) {
        setUser(null);
      }
      // If a firebase user is present but we don't have a local token,
      // it means they've just logged in with Google but the local session setup isn't complete yet.
      // The loginWithGoogle function handles the user state in this case.
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const loggedInUser = await AuthService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const loginWithGoogle = async () => {
    const loggedInUser = await AuthService.loginWithGoogle();
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const register = async (credentials: LoginCredentials) => {
    return AuthService.register(credentials);
  };

  const isAuthenticated = () => {
    return !!getToken();
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    logout,
    register,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
