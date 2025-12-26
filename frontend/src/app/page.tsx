'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './frontend/src/contexts/AuthContext';

export default function HomePage() {
  const { token, openAuthModal } = useAuth();
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastActionRef = useRef<null | { type: 'fetchMetadata' | 'download'; args: any }>(null);

  useEffect(() => {
    const onAuthLogin = () => {
      // Retry last action if any
      if (!lastActionRef.current) return;
      const action = lastActionRef.current;
      lastActionRef.current = null;

      if (action.type === 'fetchMetadata') {
        handleFetchMetadata(action.args.url);
      } else if (action.type === 'download') {
        handleDownload(action.args.payload);
      }
    };

    window.addEventListener('auth:login', onAuthLogin as EventListener);
    return () => window.removeEventListener('auth:login', onAuthLogin as EventListener);
  }, []);

  const mapError = async (resp: Response) => {
    const status = resp.status;
    let json: any = {};
    try { json = await resp.json(); } catch (e) { }

    if (status === 401) return 'LOGIN_REQUIRED';
    if (status === 403) return json.message || 'ACCESS_FORBIDDEN';
    if (status === 500) return json.message || 'SERVER_ERROR';
    return json.message || json.error || `Request failed with status ${status}`;
  };

  const handleFetchMetadata = async (fetchUrl?: string) => {
    setError(null);
    setLoading(true);
    setMetadata(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      setError('Backend not configured');
      setLoading(false);
      return;
    }

    const body = { url: fetchUrl || url };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(`${backendUrl}/video/metadata`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const friendly = await mapError(resp);

        // If login required, keep last action and prompt
        if (resp.status === 401 || resp.status === 403) {
          lastActionRef.current = { type: 'fetchMetadata', args: { url: body.url } };
          openAuthModal();
          setError(friendly);
          setLoading(false);
          return;
        }

        throw new Error(friendly);
      }

      const data = await resp.json();
      setMetadata(data);
    } catch (err: any) {
      console.error('Fetch metadata error:', err);
      setError(err.message || 'Failed to fetch metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (payload: { url: string; itag: any; format: string; trimStart?: number; trimEnd?: number }) => {
    setError(null);
    setLoading(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      setError('Backend not configured');
      setLoading(false);
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(`${backendUrl}/video/download`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const friendly = await mapError(resp);
        if (resp.status === 401 || resp.status === 403) {
          lastActionRef.current = { type: 'download', args: { payload } };
          openAuthModal();
          setError(friendly);
          setLoading(false);
          return;
        }
        throw new Error(friendly);
      }

      // Successful download: create blob and trigger save
      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition') || '';
      let filename = 'download';
      const match = /filename="?([^";]+)"?/.exec(disposition);
      if (match && match[1]) filename = match[1];

      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObj);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Universal Video Downloader</h1>

      <div className="mb-4">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste video URL" className="w-full p-2 border rounded" />
        <button onClick={() => handleFetchMetadata()} className="mt-2 px-4 py-2 bg-primary text-white rounded">Fetch</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {metadata && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">{metadata.title}</h2>
          <p>Duration: {metadata.duration}s</p>
          <img src={metadata.thumbnail} alt="thumb" className="w-48 h-auto mt-2" />

          <div className="mt-3">
            {metadata.formats?.map((f: any) => (
              <div key={f.itag} className="flex items-center justify-between border p-2 my-2">
                <div>
                  <div>{f.quality} • {f.format} • {f.fileSizeMB} MB</div>
                </div>
                <button onClick={() => handleDownload({ url: url, itag: f.itag, format: f.format })} className="px-3 py-1 bg-green-600 text-white rounded">Download</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
