'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [savedDownloads, setSavedDownloads] = useState<SavedDownload[]>([]);
  const [message, setMessage] = useState('');
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlayingQueue, setIsPlayingQueue] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadDownloads = useCallback(async () => {
    try {
      const response = await fetch('/api/downloads');

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        throw new Error('No se pudo cargar la biblioteca');
      }

      const data: SavedDownload[] = await response.json();
      setSavedDownloads(data);
    } catch (error) {
      console.error('Error cargando descargas:', error);
      setMessage('No se pudo cargar la biblioteca.');
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDownloads();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDownloads]);

  const audioDownloads = savedDownloads.filter((item) => item.type === 'audio');

  const currentTrack =
    currentTrackIndex !== null
      ? audioDownloads[currentTrackIndex]
      : null;

  const playTrack = (index: number, queueMode = false) => {
    const nextTrack = audioDownloads[index];

    if (!nextTrack) return;

    setCurrentTrackIndex(index);
    setIsPlayingQueue(queueMode);

    const fileUrl = `/api/file?path=${encodeURIComponent(
      nextTrack.filePath
    )}`;

    if (audioRef.current) {
      audioRef.current.src = fileUrl;

      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
        setMessage('Error al reproducir el audio.');
      });
    }
  };

  const handleToggleTrack = (index: number) => {
    if (currentTrackIndex === index) {
      setCurrentTrackIndex(null);
      setIsPlayingQueue(false);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      return;
    }

    playTrack(index, false);
  };

  const handlePlayAll = () => {
    if (audioDownloads.length === 0) return;

    playTrack(0, true);
  };

  const handlePreviousTrack = () => {
    if (currentTrackIndex === null || currentTrackIndex <= 0) return;

    playTrack(currentTrackIndex - 1, isPlayingQueue);
  };

  const handleNextTrack = () => {
    if (currentTrackIndex === null) return;

    const nextIndex = currentTrackIndex + 1;

    if (nextIndex >= audioDownloads.length) {
      setCurrentTrackIndex(null);
      setIsPlayingQueue(false);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      return;
    }

    playTrack(nextIndex, isPlayingQueue);
  };

  const handleDeleteDownload = async (id: number) => {
    const confirmed = window.confirm(
      'Estas seguro de que deseas eliminar esta descarga?'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/downloads?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      setSavedDownloads((prev) =>
        prev.filter((item) => item.id !== id)
      );

      setMessage('Descarga eliminada.');

      if (currentTrack?.id === id) {
        setCurrentTrackIndex(null);
        setIsPlayingQueue(false);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
      }
    } catch (error) {
      setMessage(
        `Error al eliminar: ${
          error instanceof Error
            ? error.message
            : 'Error desconocido'
        }`
      );
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 sm:px-4 md:px-6">
      {/* HERO */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-white/20 bg-linear-to-br from-slate-900 via-slate-800 to-blue-900 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              Tu biblioteca
            </p>

            <h1 className="mb-3 break-words text-2xl font-black text-white sm:text-3xl md:text-5xl">
              Biblioteca de Audio
            </h1>

            <p className="max-w-xl text-sm leading-6 text-slate-300 md:text-base">
              Reproduce tu colección como una playlist continua,
              con controles modernos y avance automático.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 text-center text-sm xs:grid-cols-2 sm:grid-cols-3">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur-md">
              <p className="text-xs text-slate-300">Audios</p>
              <p className="text-2xl font-black">
                {audioDownloads.length}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur-md">
              <p className="text-xs text-slate-300">Playlist</p>
              <p className="text-2xl font-black">Auto</p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur-md">
              <p className="text-xs text-slate-300">Estado</p>
              <p className="text-2xl font-black">
                {currentTrack ? 'On' : 'Idle'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        {/* PLAYLIST */}
        <div className="rounded-2xl border border-white/20 bg-white/90 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl dark:border-gray-700 dark:bg-gray-800/90 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Playlist
              </h2>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toca un tema o reproduce toda la cola.
              </p>
            </div>

            <button
              onClick={handlePlayAll}
              disabled={audioDownloads.length === 0}
              className="w-full rounded-full bg-linear-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              ▶ Reproducir todo
            </button>
          </div>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {audioDownloads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-400">
                No hay descargas de audio guardadas.
              </p>
            ) : (
              audioDownloads.map((download) => (
                <div
                  key={download.id}
                  className={`group rounded-2xl border p-3 transition-all duration-200 ${
                    currentTrack?.id === download.id
                      ? 'border-cyan-400 bg-cyan-50 shadow-lg shadow-cyan-100/70 dark:border-cyan-500 dark:bg-cyan-950/40'
                      : 'border-gray-200 bg-gray-50 hover:border-cyan-200 hover:bg-white hover:shadow-md dark:border-gray-700 dark:bg-gray-700/70 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex flex-col gap-3 overflow-hidden sm:flex-row sm:items-center">
                    {/* THUMB */}
                    <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-2xl bg-linear-to-br from-slate-800 to-cyan-700 shadow-sm sm:h-16 sm:w-16">
                      {download.thumbnail ? (
                        <img
                          src={download.thumbnail}
                          alt={download.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl text-white">
                          🎵
                        </div>
                      )}

                      {currentTrack?.id === download.id ? (
                        <div className="absolute inset-0 bg-black/35" />
                      ) : null}
                    </div>

                    {/* INFO */}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {download.title}
                        </p>

                        {currentTrack?.id === download.id ? (
                          <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                            Sonando
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {download.channel ?? 'Canal desconocido'}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        {download.duration ? (
                          <span>{download.duration}</span>
                        ) : null}

                        <span>Audio</span>
                      </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                      <button
                        onClick={() =>
                          handleToggleTrack(
                            audioDownloads.findIndex(
                              (item) => item.id === download.id
                            )
                          )
                        }
                        className={`rounded-full px-3 py-2 text-xs font-semibold text-white transition ${
                          currentTrack?.id === download.id
                            ? 'bg-rose-500 hover:bg-rose-600'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {currentTrack?.id === download.id
                          ? 'Pausar'
                          : 'Play'}
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteDownload(download.id)
                        }
                        className="rounded-full bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PLAYER */}
        <aside className="xl:sticky xl:top-4">
          <div className="rounded-2xl border border-white/20 bg-white/90 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl dark:border-gray-700 dark:bg-gray-800/90 md:p-6">
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                Now Playing
              </p>

              <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                Reproductor
              </h3>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-slate-950 shadow-xl dark:border-gray-700">
              {/* COVER */}
              <div className="relative aspect-square w-full max-h-[320px] bg-linear-to-br from-slate-800 via-slate-900 to-cyan-950">
                {currentTrack?.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl text-white/90">
                    🎧
                  </div>
                )}

                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    Ahora sonando
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 sm:text-lg">
                    {currentTrack?.title ??
                      'Selecciona un tema'}
                  </p>

                  <p className="truncate text-xs text-slate-300 sm:text-sm">
                    {currentTrack?.channel ?? 'Tu playlist'}
                  </p>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="space-y-4 bg-white p-4 dark:bg-gray-800">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {currentTrackIndex !== null
                      ? `${currentTrackIndex + 1}/${
                          audioDownloads.length
                        }`
                      : '0/0'}
                  </span>

                  <span>
                    {isPlayingQueue
                      ? 'Cola automática'
                      : 'Manual'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handlePreviousTrack}
                    disabled={
                      currentTrackIndex === null ||
                      currentTrackIndex <= 0
                    }
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    ⏮
                  </button>

                  <button
                    onClick={() => {
                      if (currentTrackIndex === null) {
                        handlePlayAll();
                        return;
                      }

                      handleToggleTrack(currentTrackIndex);
                    }}
                    className="rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:from-cyan-400 hover:to-blue-500"
                  >
                    {currentTrackIndex !== null ? '⏸' : '▶'}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    disabled={
                      currentTrackIndex === null ||
                      currentTrackIndex >=
                        audioDownloads.length - 1
                    }
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    ⏭
                  </button>
                </div>

                {/* AUDIO */}
                <div className="space-y-2">
                  <audio
                    ref={audioRef}
                    controls
                    className="w-full max-w-full"
                    onEnded={() => {
                      if (
                        isPlayingQueue &&
                        currentTrackIndex !== null &&
                        currentTrackIndex <
                          audioDownloads.length - 1
                      ) {
                        playTrack(currentTrackIndex + 1, true);
                        return;
                      }

                      setCurrentTrackIndex(null);
                      setIsPlayingQueue(false);
                    }}
                  />

                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full w-2/3 rounded-full bg-linear-to-r from-cyan-500 via-blue-500 to-indigo-500" />
                  </div>
                </div>

                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  La cola automática avanza sola por toda la
                  biblioteca.
                </p>

                {message ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-700">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {message}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}