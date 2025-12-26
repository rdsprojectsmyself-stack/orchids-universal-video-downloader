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
      
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        
        if (!backendUrl) {
          console.error('NEXT_PUBLIC_BACKEND_URL is not configured');
          setLoading(false);
          return;
        }

        console.log('🔄 Verifying stored token...');
        
        const response = await fetch(`${backendUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Token verified, user loaded:', data.user.email);
          setUser(data.user);
          setIsAdmin(data.user.isAdmin);
        } else {
          // Token is invalid or expired
          const errorData = await response.json().catch(() => ({}));
          console.warn('⚠️ Token verification failed:', errorData.message || response.statusText);
          
          // Clear invalid token
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAdmin(false);
          
          // Show user-friendly message for expired tokens
          if (errorData.code === 'TOKEN_EXPIRED') {
            console.log('🔐 Session expired. User needs to login again.');
          }
        }
      } catch (error) {
        console.error('❌ Failed to verify token:', error);
        // Network error or server down - keep token for retry
        // but don't set user as authenticated
        console.log('⚠️ Network error during token verification. Token kept for retry.');
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
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(newUser.isAdmin);
    setIsAuthModalOpen(false); // Close modal on successful login
  };


  const logout = async () => {
    try {
      await apiLogout();
      localStorage.removeItem('token');
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
