'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { syncGoogleAuth, loginWithEmail } from '../../lib/auth';
import { LogIn, Music, ShieldCheck, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const { loading: authLoading, isAuthenticated, login } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      initializeGoogleSignIn();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn();
          clearInterval(checkGoogle);
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }
  }, []);

  const initializeGoogleSignIn = () => {
    try {
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        console.error('Google Client ID is missing environment variable');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: isDark ? 'filled_blue' : 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth,
          text: 'continue_with',
          shape: 'pill'
        });
      }
    } catch (err) {
      console.error('Google Sign-In initialization failed:', err);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    setError('');
    setLoading(true);

    try {
      const data = await syncGoogleAuth(response.credential);
      if (data && data.token) {
        login(data.token, data.user);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginWithEmail(email, password);
      // loginWithEmail now returns { token, user }
      login(data.token, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="w-full max-w-md p-8 md:p-12 rounded-3xl backdrop-blur-[12px] border shadow-2xl"
        style={{
          background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
        }}
      >
        <div className="flex flex-col items-center gap-6 mb-8">
          <Music className="w-12 h-12 text-primary" />
          <h1 className="text-3xl font-bold text-black dark:text-white">Welcome Back</h1>
          <p className="text-center text-zinc-600 dark:text-zinc-400">Sign in to continue downloading</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6 mb-8">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-black dark:text-white">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign in
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">OR</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <div className="space-y-6">
          <div
            ref={googleBtnRef}
            className="w-full flex justify-center min-h-[44px]"
          />

          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This app uses Google OAuth 2.0 and does not store Google passwords.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          New to the platform?{' '}
          <Link href="/signup" className="text-blue-500 hover:text-blue-600 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
