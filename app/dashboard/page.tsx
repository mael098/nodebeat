'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type DownloadType = 'video' | 'audio';

type VideoInfo = {
  title: string;
  channel: string;
  duration: string;
  thumbnail: string | null;
  cleanUrl: string;
};

type SavedDownload = {
  id: number;
  title: string;
  filePath: string;
  type: string;
  channel: string | null;
  duration: string | null;
  thumbnail: string | null;
  createdAt: string;
};

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadType, setDownloadType] = useState<DownloadType>('audio');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [savedDownloads, setSavedDownloads] = useState<SavedDownload[]>([]);
  const [downloadEnabled, setDownloadEnabled] = useState(false);
  const downloadLockRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [downloadsRes, userRes] = await Promise.all([
            fetch('/api/downloads'),
            fetch('/api/user'),
          ]);

          if (!downloadsRes.ok || !userRes.ok) {
            if (!downloadsRes.ok && downloadsRes.status === 401) {
              router.replace('/login');
              return;
            }
            throw new Error('No se pudo cargar los datos');
          }

          const downloads: SavedDownload[] = await downloadsRes.json();
          const user = await userRes.json();

          setSavedDownloads(downloads);
          setDownloadEnabled(user.downloadEnabled ?? false);
        } catch (error) {
          console.error('Error cargando datos:', error);
        }
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);





  const handleAnalyze = async () => {
    if (!url.trim()) {
      setMessage('Primero pega una URL de YouTube.');
      return;
    }

    setAnalyzing(true);
    setMessage('Analizando video...');

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo analizar la URL');
      }

      setVideoInfo(data);
      setMessage('Listo: puedes descargar este video.');
    } catch (error) {
      setVideoInfo(null);
      setMessage(`Error al analizar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (downloadLockRef.current) {
      return;
    }

    if (!url.trim()) {
      setMessage('Por favor ingresa una URL de YouTube');
      return;
    }

    downloadLockRef.current = true;
    setLoading(true);
    setMessage('Descargando, esto puede tardar varios minutos...');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600000);

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoInfo?.cleanUrl ?? url,
          type: downloadType,
          title: videoInfo?.title,
          channel: videoInfo?.channel,
          duration: videoInfo?.duration,
          thumbnail: videoInfo?.thumbnail,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en la descarga');
      }

      setMessage('Preparando descarga...');

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename =
        contentDisposition?.split('filename=')[1]?.replace(/"/g, '') ||
        `descarga.${downloadType === 'video' ? 'mp4' : 'mp3'}`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setMessage('Descarga completada. Se guardo en ~/NodeBeat_Downloads');
      setUrl('');
      setVideoInfo(null);

      const refreshResponse = await fetch('/api/downloads');
      if (refreshResponse.ok) {
        const refreshedDownloads: SavedDownload[] = await refreshResponse.json();
        setSavedDownloads(refreshedDownloads);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMsg.includes('aborted')) {
        setMessage('Timeout: La descarga tardo demasiado. Intenta de nuevo.');
      } else {
        setMessage(`Error: ${errorMsg}`);
      }
    } finally {
      downloadLockRef.current = false;
      setLoading(false);
    }
  };

  const totalDownloads = savedDownloads.length;
  const lastDownloadTitle = savedDownloads[0]?.title ?? 'Sin descargas aun';

  return (
    <>
      {/* Stat bar */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Total archivos</p>
          <p className="mt-1 text-3xl font-extrabold text-[#e8efff]">{totalDownloads}</p>
        </div>
        <div className="rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Modo activo</p>
          <p className="mt-1 text-3xl font-extrabold text-[#8cb5ff]">
            {downloadType === 'audio' ? 'Audio' : 'Video'}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Ultimo registro</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#c0cfee]">{lastDownloadTitle}</p>
        </div>
      </div>

      {/* Panel de descarga */}
      <div className="rounded-3xl border border-[#2a3b64] bg-[#0c1528] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3b8a]">
            <svg className="h-5 w-5 text-[#8cb5ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#f0f5ff]">Descargar contenido</h2>
            <p className="text-xs text-[#6b82b8]">Pega una URL de YouTube y elige el formato</p>
          </div>
        </div>

        <form onSubmit={handleDownload} className="space-y-5">
          {/* URL input */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#7a93c4]">
              URL de YouTube
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setVideoInfo(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-11 flex-1 rounded-xl border border-[#2d4172] bg-[#0d1730] px-4 text-sm text-[#e0e8ff] outline-none placeholder:text-[#4a5878] focus:border-[#3f5fa8] focus:ring-1 focus:ring-[#3f5fa8] disabled:opacity-50"
                disabled={loading || analyzing}
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || analyzing}
                className="h-11 rounded-xl border border-[#3a5499] bg-[#142040] px-5 text-sm font-bold text-[#a0bcf0] transition hover:border-[#5070b8] hover:text-[#c7d8ff] disabled:opacity-50"
              >
                {analyzing ? 'Analizando...' : 'Analizar'}
              </button>
            </div>
          </div>

          {/* Video preview */}
          {videoInfo && (
            <div className="flex gap-3 rounded-2xl border border-[#2f4575] bg-[#0d1935] p-4">
              {videoInfo.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="h-20 w-32 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="h-20 w-32 shrink-0 rounded-xl bg-[#1a2d50]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#d8e4ff]">{videoInfo.title}</p>
                <p className="mt-1 text-xs text-[#7a93c4]">{videoInfo.channel}</p>
                <p className="text-xs text-[#5a6f9a]">Duracion: {videoInfo.duration}</p>
              </div>
            </div>
          )}

          {/* Type selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#7a93c4]">
              Formato
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#253459] bg-[#0d1528] p-1">
              <button
                type="button"
                onClick={() => setDownloadType('audio')}
                disabled={loading || analyzing}
                className={`rounded-lg py-2.5 text-sm font-bold transition ${
                  downloadType === 'audio'
                    ? 'bg-[#1a3b8a] text-white shadow-[0_2px_12px_rgba(26,59,138,0.45)]'
                    : 'text-[#7a93c4] hover:text-[#aec4f0]'
                }`}
              >
                Audio MP3
              </button>
              <button
                type="button"
                onClick={() => setDownloadType('video')}
                disabled={loading || analyzing}
                className={`rounded-lg py-2.5 text-sm font-bold transition ${
                  downloadType === 'video'
                    ? 'bg-[#1a3b8a] text-white shadow-[0_2px_12px_rgba(26,59,138,0.45)]'
                    : 'text-[#7a93c4] hover:text-[#aec4f0]'
                }`}
              >
                Video MP4
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || analyzing || (!downloadEnabled && totalDownloads >= 2)}
            className="w-full rounded-xl bg-[#1a3b8a] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(26,59,138,0.4)] transition hover:bg-[#1f4aab] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? 'Descargando...'
              : !downloadEnabled && totalDownloads >= 2
              ? 'Limite alcanzado — Contacta al admin'
              : 'Descargar'}
          </button>

          {/* Status banners */}
          {!downloadEnabled && totalDownloads >= 1 && (
            <div className="rounded-xl border border-[#6b4a1a] bg-[#1e1208] p-3 text-xs">
              <p className="font-bold text-[#f5c87a]">Descargas: {totalDownloads}/2 disponibles</p>
              {totalDownloads >= 2 && (
                <p className="mt-1 text-[#c8a55e]">
                  Alcanzaste el limite gratuito. Contacta al administrador para activar acceso ilimitado.
                </p>
              )}
            </div>
          )}

          {downloadEnabled && (
            <div className="rounded-xl border border-[#1a4a30] bg-[#0b1f14] p-3 text-xs">
              <p className="font-bold text-[#5fe09a]">Acceso ilimitado de descargas activado</p>
            </div>
          )}
        </form>

        {message && (
          <div className="mt-5 rounded-xl border border-[#2a3b64] bg-[#0d1835] p-4">
            <p className="text-sm text-[#b0c4e8]">{message}</p>
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-xs text-[#3d5278]">
        Las descargas se guardan en ~/NodeBeat_Downloads
      </p>
    </>
  );
}
