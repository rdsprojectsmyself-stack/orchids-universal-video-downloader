'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Music, LogOut, User, Home, Shield, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const { user, isAdmin, logout, openAuthModal } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[90] px-4 md:px-8 py-6">
      <div className="max-w-7xl mx-auto px-6 py-4 glass-dark flex items-center justify-between border-white/10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all group">
          <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-all">
            <Music className="w-7 h-7 text-blue-500" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
            Universal <span className="text-blue-500">Video</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <Home className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Dashboard</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden md:inline text-sm font-medium">Admin</span>
                </Link>
              )}
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={openAuthModal}
                className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                onClick={openAuthModal}
                className="px-6 py-2.5 rounded-xl premium-gradient-btn flex items-center gap-2 text-sm font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
