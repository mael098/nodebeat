'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadType, setDownloadType] = useState<DownloadType>('audio');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [savedDownloads, setSavedDownloads] = useState<SavedDownload[]>([]);
  const downloadLockRef = useRef(false);

  useEffect(() => {
    loadDownloads();
  }, []);

  async function loadDownloads() {
    try {
      const response = await fetch('/api/downloads');
      if (!response.ok) {
        throw new Error('No se pudo cargar la biblioteca');
      }
      const data: SavedDownload[] = await response.json();
      setSavedDownloads(data);
    } catch (error) {
      console.error('Error cargando descargas:', error);
    }
  }

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

      await loadDownloads();
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
  const lastDownloadTitle = savedDownloads[0]?.title ?? 'Sin descargas';

  return (
    <>
      <div className="mb-8 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-blue-100/70 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80 dark:shadow-black/20 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Panel principal
            </p>
            <h1 className="mb-2 text-3xl font-extrabold text-gray-900 dark:text-white md:text-4xl">NodeBeat</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Analiza videos, descarga en audio o video y administra tu biblioteca en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
              <p className="text-xs text-blue-700 dark:text-blue-300">Total archivos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalDownloads}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Modo activo</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{downloadType === 'audio' ? 'Audio' : 'Video'}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
          Ultimo titulo registrado: <span className="font-semibold">{lastDownloadTitle}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div
          id="descargar"
          className="scroll-mt-28 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100/50 dark:border-gray-700 dark:bg-gray-800/90 dark:shadow-black/20"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Descargar</h2>

            <form onSubmit={handleDownload} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL de YouTube
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setVideoInfo(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  disabled={loading || analyzing}
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || analyzing}
                  className="mt-2 w-full rounded-xl border border-blue-500 py-2 font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-gray-700"
                >
                  {analyzing ? 'Analizando...' : 'Analizar URL'}
                </button>
              </div>

              {videoInfo && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex gap-3">
                    {videoInfo.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="h-20 w-32 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-20 w-32 rounded-md bg-gray-300 dark:bg-gray-700" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {videoInfo.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{videoInfo.channel}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Duracion: {videoInfo.duration}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Que descargar?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadType('audio')}
                    className={`rounded-lg px-3 py-2 font-medium transition ${
                      downloadType === 'audio'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                    disabled={loading || analyzing}
                  >
                    Audio (MP3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadType('video')}
                    className={`rounded-lg px-3 py-2 font-medium transition ${
                      downloadType === 'video'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                    disabled={loading || analyzing}
                  >
                    Video (MP4)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || analyzing}
                className="w-full rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 py-3 font-bold text-white transition hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Descargando...' : 'Descargar'}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-700">
                <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
              </div>
            )}
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Las descargas se guardan en ~/NodeBeat_Downloads</p>
      </div>

    </>
  );
}
