'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Search, Download, Scissors, AlertCircle, Loader2, Sparkles, Youtube, Globe, Play, Music } from 'lucide-react';

export default function HomePage() {
  const { token, isAuthenticated, loading: authLoading, openAuthModal } = useAuth();
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrim, setShowTrim] = useState(false);
  const [trimStart, setTrimStart] = useState('');
  const [trimEnd, setTrimEnd] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<any>(null);
  const lastActionRef = useRef<null | { type: 'fetchMetadata' | 'download' | 'trim'; args: any }>(null);

  // Auth Gate: Automatically open modal if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      openAuthModal();
    }
  }, [authLoading, isAuthenticated]);

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
      } else if (action.type === 'trim') {
        handleTrim(action.args.payload);
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
    if (!url && !fetchUrl) return;
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

      const downloadEndpoint = token ? '/video/download' : '/video/download/guest';

      const resp = await fetch(`${backendUrl}${downloadEndpoint}`, {
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

  const handleTrim = async (payload: { url: string; itag: any; format: string; trimStart: number; trimEnd: number }) => {
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

      const resp = await fetch(`${backendUrl}/video/trim`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const friendly = await mapError(resp);
        if (resp.status === 401 || resp.status === 403) {
          lastActionRef.current = { type: 'trim', args: { payload } };
          openAuthModal();
          setError(friendly);
          setLoading(false);
          return;
        }
        throw new Error(friendly);
      }

      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition') || '';
      let filename = 'trimmed_video';
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
      console.error('Trim error:', err);
      setError(err.message || 'Trim failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8">
      <Navbar />

      <main className="max-w-4xl mx-auto flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-center gap-2 mb-4 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 w-fit mx-auto cursor-default group">
            <Sparkles size={14} className="text-blue-500 group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-blue-500">Premium Downloader v2.0</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Download Any <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Video</span> in Seconds
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto font-medium">
            The ultimate universal video downloader. Fast, simple, and highest quality supported.
          </p>
        </div>

        {/* Search Input Section */}
        <div className={`w-full max-w-3xl glass-dark p-2 mb-10 transition-all duration-500 ${!isAuthenticated && !authLoading ? 'blur-md pointer-events-none scale-[0.98]' : 'animate-in fade-in zoom-in-95'}`}>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30">
                <Globe size={20} />
              </div>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste video URL from YouTube, Instagram, etc."
                className="w-full bg-transparent border-none focus:ring-0 text-white pl-14 pr-4 py-4 md:py-6 text-base md:text-lg placeholder-white/20 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleFetchMetadata()}
              />
            </div>
            <button
              onClick={() => handleFetchMetadata()}
              disabled={loading || !url}
              className="px-8 md:px-12 py-4 md:py-2 premium-gradient-btn rounded-xl flex items-center justify-center gap-3 text-lg font-bold shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Search size={22} />}
              <span>{loading ? 'Fetching...' : 'Fetch'}</span>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="w-full max-w-3xl mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400">
              <AlertCircle className="shrink-0" />
              <p className="text-sm font-medium">{error === 'LOGIN_REQUIRED' ? 'Please sign in to access premium features.' : error}</p>
            </div>
          </div>
        )}

        {/* Results Metadata Section */}
        {metadata && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Thumbnail Card */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="glass-dark overflow-hidden p-3 border-white/5 relative group">
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  className="w-full h-auto rounded-xl object-cover aspect-video group-hover:scale-[1.02] transition-transform duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <Play className="text-white fill-white" size={32} />
                  </div>
                </div>
              </div>
              <div className="glass-dark p-6 border-white/5">
                <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight">{metadata.title}</h2>
                <div className="flex items-center gap-4 text-white/40 text-sm font-medium">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={14} className="text-blue-500" />
                    {metadata.duration}s
                  </span>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-black text-purple-400">
                    {metadata.source || 'Direct'}
                  </span>
                </div>
              </div>
            </div>

            {/* Formats Selection */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-dark p-6 border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Download size={20} className="text-blue-500" />
                    Available Formats
                  </h3>
                  {!token && (
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-white/40 font-bold tracking-tighter">GUEST ACCESS</span>
                  )}
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {metadata.formats
                    ?.filter((f: any) => {
                      if (token) return true;
                      const quality = parseInt(f.quality.replace('p', '').replace(/[^\d]/g, ''));
                      return quality <= 720 || isNaN(quality);
                    })
                    .map((f: any) => (
                      <div key={f.itag} className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${f.format === 'mp4' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                            {f.format === 'mp4' ? <Play size={16} /> : <Music size={16} />}
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm tracking-wide">{f.quality} <span className="text-white/30 font-normal">({f.format})</span></div>
                            <div className="text-[10px] text-white/30 font-bold">{f.fileSizeMB} MB</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload({ url, itag: f.itag, format: f.format })}
                            className="p-2.5 bg-white/5 hover:bg-blue-500 hover:text-white text-white/60 rounded-xl transition-all border border-white/5 hover:border-blue-400"
                            title="Download Now"
                          >
                            <Download size={18} />
                          </button>
                          {token && (
                            <button
                              onClick={() => {
                                setSelectedFormat(f);
                                setShowTrim(true);
                              }}
                              className="p-2.5 bg-white/5 hover:bg-purple-500 hover:text-white text-white/60 rounded-xl transition-all border border-white/5 hover:border-purple-400"
                              title="Trim & Edit"
                            >
                              <Scissors size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {!token && metadata.formats?.some((f: any) => {
                  const quality = parseInt(f.quality.replace('p', '').replace(/[^\d]/g, ''));
                  return quality > 720 && !isNaN(quality);
                }) && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-2xl">
                      <div className="flex gap-4 items-center">
                        <div className="p-3 bg-blue-500/20 rounded-full">
                          <Sparkles className="text-blue-500" size={24} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm mb-1">Unlock 4K & Unlimited Trimming</p>
                          <p className="text-white/40 text-xs font-medium leading-relaxed">Sign in to download in higher resolutions and unlock AI video editing tools.</p>
                        </div>
                        <button onClick={openAuthModal} className="ml-auto px-6 py-2.5 premium-gradient-btn rounded-xl text-xs font-black shadow-lg shadow-blue-500/10">
                          UPGRADE
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Trim Modal UI */}
        {showTrim && selectedFormat && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-dark w-full max-w-md p-8 border-white/10 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-white mb-2">Trim Video</h3>
              <p className="text-white/40 text-sm mb-8 font-medium">
                Set the start and end points for <span className="text-blue-500">{selectedFormat.quality}</span>
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Start Time (seconds)</label>
                  <input
                    type="number"
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">End Time (seconds)</label>
                  <input
                    type="number"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    placeholder="10"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="1"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowTrim(false);
                      setSelectedFormat(null);
                      setTrimStart('');
                      setTrimEnd('');
                    }}
                    className="flex-1 px-4 py-3 bg-white/5 text-white/60 hover:text-white rounded-xl font-bold border border-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const start = parseFloat(trimStart) || 0;
                      const end = parseFloat(trimEnd) || 10;
                      handleTrim({
                        url: url,
                        itag: selectedFormat.itag,
                        format: selectedFormat.format,
                        trimStart: start,
                        trimEnd: end
                      });
                      setShowTrim(false);
                      setSelectedFormat(null);
                      setTrimStart('');
                      setTrimEnd('');
                    }}
                    className="flex-[2] px-4 py-3 premium-gradient-btn rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Scissors size={18} />
                    Trim & Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Background visual element */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full -z-10 pointer-events-none opacity-50" />
    </div>
  );
}

