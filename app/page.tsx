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
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  const handlePlayAudio = (download: SavedDownload) => {
    if (currentPlayingId === download.id) {
      setCurrentPlayingId(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    setCurrentPlayingId(download.id);
    const fileUrl = `/api/file?path=${encodeURIComponent(download.filePath)}`;
    if (audioRef.current) {
      audioRef.current.src = fileUrl;
      audioRef.current
        .play()
        .catch((error) => {
          console.error('Error playing audio:', error);
          setMessage('Error al reproducir el audio.');
        });
    }
  };

  const handleDeleteDownload = async (id: number) => {
    const confirmed = window.confirm('Estas seguro de que deseas eliminar esta descarga?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/downloads?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      setSavedDownloads((prev) => prev.filter((item) => item.id !== id));
      setMessage('Descarga eliminada.');
      if (currentPlayingId === id) {
        setCurrentPlayingId(null);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
      }
    } catch (error) {
      setMessage(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const audioDownloads = savedDownloads.filter((item) => item.type === 'audio');

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">NodeBeat</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Centro multimedia: analiza, descarga y reproduce desde almacenamiento local.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 lg:col-span-2">
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
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  disabled={loading || analyzing}
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || analyzing}
                  className="mt-2 w-full rounded-lg border border-blue-500 py-2 font-medium text-blue-600 disabled:opacity-50 dark:text-blue-300"
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
                className="w-full rounded-lg bg-linear-to-r from-blue-500 to-indigo-600 py-3 font-bold text-white transition hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Descargando...' : 'Descargar'}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Biblioteca</h2>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {audioDownloads.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay descargas de audio guardadas.</p>
              ) : (
                audioDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="rounded-md bg-gray-100 p-2 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          <span className="mr-1.5" aria-hidden="true">
                            🎵
                          </span>
                          {download.title}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">{download.channel ?? 'Canal desconocido'}</p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePlayAudio(download)}
                          className={`rounded px-2 py-1 text-white ${
                            currentPlayingId === download.id ? 'bg-red-500' : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          {currentPlayingId === download.id ? 'Stop' : 'Play'}
                        </button>
                        <button
                          onClick={() => handleDeleteDownload(download.id)}
                          className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {currentPlayingId ? 'Reproduciendo...' : 'Selecciona un audio para reproducir'}
              </p>
              <audio
                ref={audioRef}
                controls
                className="w-full"
                onEnded={() => setCurrentPlayingId(null)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Las descargas se guardan en ~/NodeBeat_Downloads</p>
        </div>
      </div>
    </div>
  );
}
