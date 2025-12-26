'use client';

import { useAuth } from '@/contexts/AuthContext';
import { logOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Music, LogOut, User, Home, Shield } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4"
    >
      <div 
        className="max-w-7xl mx-auto px-6 py-4 rounded-2xl backdrop-blur-[12px] border flex items-center justify-between"
        style={{
          background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Music className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-black dark:text-white hidden sm:block">
            Video Downloader
          </span>
        </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-black dark:text-white hover:bg-white/10 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-black dark:text-white hover:bg-white/10 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-black dark:text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 transition-transform"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
