'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logOut as apiLogout } from '../lib/auth';



interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  isAdmin: false,
  isAuthModalOpen: false,
  openAuthModal: () => { },
  closeAuthModal: () => { },
  login: () => { },
  logout: async () => { },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const ADMIN_EMAIL = 'dhanaprabha216@gmail.com';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      setToken(storedToken);

      // We trust the token in localStorage for initial state to prevent UI flicker
      // The backend will validate it on the first functional request anyway
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAdmin(parsedUser.isAdmin || parsedUser.email === ADMIN_EMAIL);
        } catch (e) {
          console.error('Failed to parse saved user', e);
        }
      }

      setLoading(false);
    };

    initAuth();

    const handleStorageChange = () => {
      const newToken = localStorage.getItem('token');
      if (!newToken) {
        setToken(null);
        setUser(null);
        setIsAdmin(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(newUser.isAdmin || newUser.email === ADMIN_EMAIL);
    setIsAuthModalOpen(false); // Close modal on successful login
  };


  const logout = async () => {
    try {
      await apiLogout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);


  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      loading,
      isAdmin,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
