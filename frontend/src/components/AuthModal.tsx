'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncGoogleAuth } from "../lib/auth";



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
      initializeGoogleSignIn();
    }
  }, [isAuthModalOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <button onClick={closeAuthModal} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full p-3 bg-white/5 rounded" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 bg-white/5 rounded" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 bg-white/5 rounded" />
          {mode === 'signup' && (
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full p-3 bg-white/5 rounded" />
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button type="submit" disabled={isLoading} className="w-full p-3 bg-primary rounded text-white">{isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Create account')}</button>

          <div className="py-3 text-center">or</div>

          <div ref={googleBtnRef} className="w-full flex justify-center" />

          <div className="text-sm text-center text-white/60 mt-3">
            {mode === 'login' ? (
              <span>New here? <button type="button" onClick={() => setMode('signup')} className="underline">Create an account</button></span>
            ) : (
              <span>Already have an account? <button type="button" onClick={() => setMode('login')} className="underline">Sign in</button></span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
