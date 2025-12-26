'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { User, Mail, Shield } from 'lucide-react';
import Navbar from '../../components/Navbar';

export default function ProfilePage() {
  const { user, loading } = useAuth();
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-28 px-4 md:px-8 pb-8">
        <div className="max-w-4xl mx-auto">
          <div
            className="p-8 md:p-12 rounded-3xl backdrop-blur-[12px] border shadow-2xl"
            style={{
              background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
            }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white">
                  Profile
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                  Manage your account settings
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div
                className="p-6 rounded-2xl backdrop-blur-sm"
                style={{
                  background: isDark ? 'rgba(40, 40, 40, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-black dark:text-white">Email Address</h3>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 mb-2">{user?.email}</p>
              </div>

              <div
                className="p-6 rounded-2xl backdrop-blur-sm"
                style={{
                  background: isDark ? 'rgba(40, 40, 40, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-black dark:text-white">Display Name</h3>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300">
                  {user?.name || 'Not set'}
                </p>
              </div>

              <div
                className="p-6 rounded-2xl backdrop-blur-sm"
                style={{
                  background: isDark ? 'rgba(40, 40, 40, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-lg font-semibold text-black dark:text-white">User ID</h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono break-all">
                  {user?.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
