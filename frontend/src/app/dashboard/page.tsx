'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Globe, Loader2, Video, Music, Download } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useRouter } from 'next/navigation';

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  formats: any[];
}

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [selectedFormat, setSelectedFormat] = useState<any>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);


  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFetchMetadata = async () => {
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setMetadata(null);
    setHasDownloaded(false);


    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) throw new Error('BACKEND_URL is not configured');

      const response = await fetch(`${backendUrl}/api/video/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch metadata');
      }

      const data = await response.json();
      setMetadata(data);
      setTrimStart(0);
      setTrimEnd(data.duration);
      setMaxDuration(data.duration);

      const initialFormat = data.formats?.find((f: any) => mode === 'audio' ? f.format === 'mp3' : f.format !== 'mp3');
      setSelectedFormat(initialFormat || data.formats?.[0]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (metadata && metadata.formats) {
      const format = metadata.formats.find((f: any) => mode === 'audio' ? f.format === 'mp3' : f.format !== 'mp3');
      setSelectedFormat(format || metadata.formats[0]);
    }
  }, [mode, metadata]);

  const handleDownload = async (isTrimmed = false) => {
    if (!url || !selectedFormat) return;

    if (isTrimmed && trimStart >= trimEnd) {
      setError('Start time must be less than end time');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) throw new Error('BACKEND_URL is not configured');

      const response = await fetch(`${backendUrl}/api/video/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          itag: selectedFormat.itag,
          format: mode === 'audio' ? 'mp3' : selectedFormat.format,
          trimStart: isTrimmed ? trimStart : 0,
          trimEnd: isTrimmed ? trimEnd : 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const fileExt = mode === 'audio' ? 'mp3' : (selectedFormat.format || 'mp4');
      const trimSuffix = isTrimmed ? `_trimmed_${formatTime(trimStart)}-${formatTime(trimEnd)}` : '';
      a.download = `${metadata?.title || 'video'}${trimSuffix}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      if (!isTrimmed) {
        setHasDownloaded(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505]">
      {/* Global Background */}
      <div
        className="fixed inset-0 z-0 opacity-30"
        style={{
          backgroundImage: `url('/background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(3px)',
        }}
      />

      <Navbar />

      <div className="relative z-10 pt-28 px-4 md:px-8 pb-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-4xl">
          <div
            className="p-8 md:p-12 rounded-[2.5rem] backdrop-blur-[20px] shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-center mb-4 text-white tracking-tight">
              Universal <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Downloader</span>
            </h1>
            <p className="text-white/40 text-center mb-12 text-lg">Premium video & audio extraction</p>

            {/* URL Input Area */}
            <div className="mb-10">
              <div
                className="flex flex-col md:flex-row items-stretch md:items-center gap-4 px-6 py-5 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus-within:border-blue-500/50 transition-all"
              >
                <div className="flex items-center gap-3 text-white/50 md:border-r border-white/10 md:pr-5">
                  <Globe className="w-6 h-6" />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste video URL here..."
                  className="flex-1 bg-transparent text-white placeholder-white/20 focus:outline-none text-lg"
                />
                <button
                  onClick={handleFetchMetadata}
                  disabled={!url || isLoading}
                  className="px-10 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-md">
                <p className="text-sm text-red-400 text-center font-medium">{error}</p>
              </div>
            )}

            {/* Video Preview Section */}
            {metadata && (
              <div className="mb-10 flex flex-col md:flex-row gap-8 items-center p-8 rounded-3xl bg-white/[0.03] border border-white/[0.05] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <img src={metadata.thumbnail} alt={metadata.title} className="w-full md:w-64 rounded-2xl shadow-2xl border border-white/10" />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2 leading-tight">{metadata.title}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
                      {formatTime(metadata.duration)}
                    </span>
                    <span className="text-white/30 text-sm">Valid Source Verified</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
                <button
                  onClick={() => setMode('video')}
                  className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-sm transition-all ${mode === 'video'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Video className="w-5 h-5" />
                  VIDEO (MP4)
                </button>
                <button
                  onClick={() => setMode('audio')}
                  className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-sm transition-all ${mode === 'audio'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Music className="w-5 h-5" />
                  AUDIO (MP3)
                </button>
              </div>
            </div>

            {/* Quality & Format Selection */}
            {metadata && (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-sm font-black text-white/50 uppercase tracking-widest mb-6">Select Quality Output</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {metadata.formats?.filter(f => mode === 'audio' ? f.format === 'mp3' : f.format !== 'mp3').map((f) => (
                      <button
                        key={f.itag}
                        onClick={() => {
                          setSelectedFormat(f);
                          setHasDownloaded(false);
                        }}
                        className={`p-5 rounded-2xl transition-all border text-left group ${selectedFormat?.itag === f.itag
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-white/3 border-white/5 text-white/40 hover:border-white/20 hover:bg-white/5'
                          }`}
                      >

                        <div className="flex flex-col gap-1">
                          <span className={`text-lg font-black transition-colors ${selectedFormat?.itag === f.itag ? 'text-white' : 'group-hover:text-white'}`}>{f.quality}</span>
                          <span className="text-xs font-medium opacity-50 uppercase">{f.fileSizeMB} MB</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trimming UI */}
                {hasDownloaded && (
                  <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">{formatTime(trimStart)}</span>
                      <p className="text-sm font-black text-white/50 uppercase tracking-widest">Precise Range Trim</p>
                      <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">{formatTime(trimEnd)}</span>
                    </div>

                    <div className="relative h-4 bg-white/5 rounded-full mb-4">
                      <div
                        className="absolute h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-[0_0_25px_rgba(37,99,235,0.4)]"
                        style={{
                          left: `${(trimStart / maxDuration) * 100}%`,
                          right: `${100 - (trimEnd / maxDuration) * 100}%`
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={maxDuration}
                        value={trimStart}
                        onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))}
                        className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer z-10"
                      />
                      <input
                        type="range"
                        min={0}
                        max={maxDuration}
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 1))}
                        className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer z-20"
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-blue-600 shadow-xl pointer-events-none transition-transform active:scale-125"
                        style={{ left: `calc(${(trimStart / maxDuration) * 100}% - 12px)` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-blue-600 shadow-xl pointer-events-none transition-transform active:scale-125"
                        style={{ left: `calc(${(trimEnd / maxDuration) * 100}% - 12px)` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/20 font-bold uppercase tracking-tighter">
                      <span>Video Start</span>
                      <span>Video End</span>
                    </div>
                  </div>
                )}


                <div className="flex flex-col items-center gap-6">
                  {!hasDownloaded ? (
                    <button
                      onClick={() => handleDownload(false)}
                      disabled={isDownloading || !metadata || !selectedFormat}
                      className="group relative px-20 py-6 rounded-[2rem] bg-white text-black font-black text-2xl transition-all hover:scale-[1.05] hover:shadow-[0_20px_40px_rgba(255,255,255,0.2)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 overflow-hidden"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                          <Download className="w-8 h-8" />
                          Start Download
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full space-y-6">
                      <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center">
                        <p className="text-green-400 font-bold">✓ Download Successful! You can now trim the video above.</p>
                      </div>
                      <button
                        onClick={() => handleDownload(true)}
                        disabled={isDownloading}
                        className="w-full group relative px-20 py-6 rounded-[2rem] bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-2xl transition-all hover:scale-[1.05] hover:shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 overflow-hidden"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin" />
                            Trimming...
                          </>
                        ) : (
                          <>
                            <Video className="w-8 h-8" />
                            Download Trimmed Version
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {!metadata && !isLoading && (
              <div className="mt-12 flex flex-col items-center gap-4 opacity-20">
                <div className="w-16 h-1 bg-white/50 rounded-full" />
                <p className="text-center text-white font-bold uppercase tracking-[0.3em] text-xs">Awaiting Global Source</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
