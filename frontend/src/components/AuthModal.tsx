'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncGoogleAuth } from '../lib/auth';
import { LogIn, Music, ShieldCheck, Mail, Lock, User, X } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isAuthModalOpen && typeof window !== 'undefined' && (window as any).google) {
      // Small delay to ensure the container is rendered
      const timer = setTimeout(() => {
        initializeGoogleSignIn();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthModalOpen]);

  // Re-initialize if container ref changes
  useEffect(() => {
    if (isAuthModalOpen && googleBtnRef.current && (window as any).google) {
      initializeGoogleSignIn();
    }
  }, [googleBtnRef.current, isAuthModalOpen]);

  const initializeGoogleSignIn = () => {
    try {
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        console.error('Google Client ID is missing');
        return;
      }

      (window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_blue',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 300,
          text: 'continue_with',
          shape: 'pill'
        });
      }
    } catch (err) {
      console.error('Google Sign-In initialization failed:', err);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    setError(null);
    setIsLoading(true);

    try {
      const data = await syncGoogleAuth(response.credential);
      if (data && data.token) {
        login(data.token, data.user);
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';

      const body = mode === 'login'
        ? { email, password }
        : { email, password, name };

      if (mode === 'signup' && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) throw new Error('🔒 Please sign in to continue');
        if (response.status === 403) throw new Error('⚠️ Access restricted');
        if (response.status === 500) throw new Error('Server error, try again later');
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      login(data.token, data.user);
      closeAuthModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-[440px] glass-dark p-8 md:p-10 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuthModal}
          className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center gap-6 mb-8 text-center">
          <div className="p-3 bg-white/5 rounded-2xl">
            <Music className="w-10 h-10 text-blue-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-white/60 text-sm">
              {mode === 'login' ? 'Sign in to continue downloading' : 'Join us to start downloading videos'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
            />
          </div>

          {mode === 'signup' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 premium-gradient-btn rounded-xl flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
              </>
            )}
          </button>

          <div className="relative py-2 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-white/30 text-xs">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div
            ref={googleBtnRef}
            className="w-full flex justify-center min-h-[44px]"
          />

          <div className="pt-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3 items-start p-4">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              This app uses Google OAuth 2.0 and does not store Google passwords.
            </p>
          </div>

          <div className="text-sm text-center text-white/40 mt-6">
            {mode === 'login' ? (
              <span>New here? <button type="button" onClick={() => setMode('signup')} className="text-blue-400 hover:text-blue-300 font-medium">Create an account</button></span>
            ) : (
              <span>Already have an account? <button type="button" onClick={() => setMode('login')} className="text-blue-400 hover:text-blue-300 font-medium">Sign in</button></span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

