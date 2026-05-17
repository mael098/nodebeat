'use client';

import { useEffect, useRef, useState } from 'react';

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

export default function BibliotecaPage() {
  const [savedDownloads, setSavedDownloads] = useState<SavedDownload[]>([]);
  const [message, setMessage] = useState('');
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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
      setMessage('No se pudo cargar la biblioteca.');
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDownloads();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

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
    <>
      <div className="mb-8 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-blue-100/70 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80 dark:shadow-black/20 md:p-8">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
          Tu biblioteca
        </p>
        <h1 className="mb-2 text-3xl font-extrabold text-gray-900 dark:text-white md:text-4xl">Biblioteca de Audio</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Reproduce, organiza y elimina los audios que ya descargaste.
        </p>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100/50 dark:border-gray-700 dark:bg-gray-800/90 dark:shadow-black/20">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Audios guardados</h2>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {audioDownloads.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay descargas de audio guardadas.</p>
          ) : (
            audioDownloads.map((download) => (
              <div key={download.id} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-700/70 dark:text-gray-200">
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

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handlePlayAudio(download)}
                      className={`rounded-lg px-2 py-1 text-white ${
                        currentPlayingId === download.id ? 'bg-red-500' : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {currentPlayingId === download.id ? 'Stop' : 'Play'}
                    </button>
                    <button
                      onClick={() => handleDeleteDownload(download.id)}
                      className="rounded-lg bg-red-500 px-2 py-1 text-white hover:bg-red-600"
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

        {message ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-700">
            <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
