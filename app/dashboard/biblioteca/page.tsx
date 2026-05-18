'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
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

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

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
    <div className="overflow-x-hidden">
      {/* Stat bar */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Audios</p>
          <p className="mt-1 text-3xl font-extrabold text-[#e8efff]">{audioDownloads.length}</p>
        </div>
        <div className="rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Playlist</p>
          <p className="mt-1 text-3xl font-extrabold text-[#8cb5ff]">Auto</p>
        </div>
        <div className="rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Estado</p>
          <p className="mt-1 text-3xl font-extrabold text-[#e8efff]">{currentTrack ? 'On' : 'Idle'}</p>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        {/* Playlist */}
        <div className="rounded-3xl border border-[#2a3b64] bg-[#0c1528] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#f0f5ff]">Playlist</h2>
              <p className="text-xs text-[#6b82b8]">Toca un tema o reproduce toda la cola.</p>
            </div>
            <button
              onClick={handlePlayAll}
              disabled={audioDownloads.length === 0}
              suppressHydrationWarning
              className="w-full rounded-xl bg-[#1a3b8a] px-5 py-2 text-sm font-bold text-white shadow-[0_4px_16px_rgba(26,59,138,0.35)] transition hover:bg-[#1f4aab] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              ▶ Reproducir todo
            </button>
          </div>

          <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
            {audioDownloads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#2d4172] p-6 text-sm text-[#4a5878]">
                No hay descargas de audio guardadas.
              </p>
            ) : (
              audioDownloads.map((download) => (
                <div
                  key={download.id}
                  className={`relative rounded-2xl border p-3 transition-all duration-200 ${
                    currentTrack?.id === download.id
                      ? 'border-[#3a5faa] bg-[#0f2045] shadow-[0_4px_20px_rgba(26,59,138,0.3)]'
                      : 'border-[#1e2e50] bg-[#0d1730] hover:border-[#2d4172] hover:bg-[#101e3a]'
                  }`}
                >
                  <button
                    onClick={() => handleDeleteDownload(download.id)}
                    className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg text-[#3d5278] transition hover:bg-[#2a1010] hover:text-[#e07070]"
                    title="Eliminar"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex flex-col gap-3 overflow-hidden sm:flex-row sm:items-center">
                    {/* Thumb */}
                    <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-xl bg-[#1a2d50] sm:h-14 sm:w-14">
                      {download.thumbnail ? (
                        <Image
                          src={download.thumbnail}
                          alt={download.title}
                          className="h-full w-full object-cover"
                          layout="fill"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg text-[#4a6090]">
                          ♪
                        </div>
                      )}
                      {currentTrack?.id === download.id && (
                        <div className="absolute inset-0 bg-[#1a3b8a]/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#d8e4ff]">{download.title}</p>
                        {currentTrack?.id === download.id && (
                          <span className="rounded-full bg-[#1a3b8a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8cb5ff]">
                            Sonando
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#5a6f9a]">
                        {download.channel ?? 'Canal desconocido'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#3d5278]">
                        {download.duration && <span>{download.duration}</span>}
                        <span>Audio</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="sm:flex sm:w-auto">
                      <button
                        onClick={() =>
                          handleToggleTrack(audioDownloads.findIndex((item) => item.id === download.id))
                        }
                        className={`rounded-xl px-5 py-2 text-xs font-bold text-white transition ${
                          currentTrack?.id === download.id
                            ? 'bg-[#8a1a2e] hover:bg-[#a82035]'
                            : 'bg-[#1a3b8a] hover:bg-[#1f4aab]'
                        }`}
                      >
                        {currentTrack?.id === download.id ? 'Pausar' : 'Play'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Player */}
        <aside className="xl:sticky xl:top-4">
          <div className="rounded-3xl border border-[#2a3b64] bg-[#0c1528] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3b8a]">
                <svg className="h-5 w-5 text-[#8cb5ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b82b8]">Now Playing</p>
                <h3 className="text-sm font-extrabold text-[#f0f5ff]">Reproductor</h3>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#1e2e50] bg-[#08101e]">
              {/* Cover */}
              <div className="relative aspect-square w-full bg-[#0d1a30]">
                {currentTrack?.thumbnail ? (
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                    layout="fill"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl text-[#2a3b64]">
                    ♫
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-[#08101e] via-[#08101e]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8cb5ff]">Ahora sonando</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-[#e8efff] sm:text-base">
                    {currentTrack?.title ?? 'Selecciona un tema'}
                  </p>
                  <p className="truncate text-xs text-[#6b82b8]">
                    {currentTrack?.channel ?? 'Tu playlist'}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 bg-[#0c1528] p-4">
                <div className="flex items-center justify-between text-xs text-[#4a5f8a]">
                  <span>
                    {currentTrackIndex !== null
                      ? `${currentTrackIndex + 1} / ${audioDownloads.length}`
                      : '0 / 0'}
                  </span>
                  <span>{isPlayingQueue ? 'Cola automática' : 'Manual'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handlePreviousTrack}
                    disabled={currentTrackIndex === null || currentTrackIndex <= 0}
                    className="rounded-xl border border-[#2d4172] bg-[#0d1730] py-2.5 text-sm text-[#8fa8d8] transition hover:bg-[#142040] disabled:cursor-not-allowed disabled:opacity-30"
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
                    className="rounded-xl bg-[#1a3b8a] py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(26,59,138,0.4)] transition hover:bg-[#1f4aab]"
                  >
                    {currentTrackIndex !== null ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={handleNextTrack}
                    disabled={currentTrackIndex === null || currentTrackIndex >= audioDownloads.length - 1}
                    className="rounded-xl border border-[#2d4172] bg-[#0d1730] py-2.5 text-sm text-[#8fa8d8] transition hover:bg-[#142040] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ⏭
                  </button>
                </div>

                {/* Hidden native audio */}
                <audio
                  ref={audioRef}
                  className="hidden"
                  onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                  onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
                  onPlay={() => setIsAudioPlaying(true)}
                  onPause={() => setIsAudioPlaying(false)}
                  onEnded={() => {
                    setIsAudioPlaying(false);
                    if (
                      isPlayingQueue &&
                      currentTrackIndex !== null &&
                      currentTrackIndex < audioDownloads.length - 1
                    ) {
                      playTrack(currentTrackIndex + 1, true);
                      return;
                    }
                    setCurrentTrackIndex(null);
                    setIsPlayingQueue(false);
                  }}
                />

                {/* Custom player UI */}
                <div className="space-y-3 rounded-2xl border border-[#1e2e50] bg-[#070d1c] p-4">
                  {/* Progress bar */}
                  <div
                    className="group relative h-1 cursor-pointer rounded-full bg-[#1a2d50]"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const newTime = ratio * duration;
                      if (audioRef.current) audioRef.current.currentTime = newTime;
                      setCurrentTime(newTime);
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-[#3a60c8] transition-all duration-100"
                      style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                    />
                    {/* Scrubber dot */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_6px_rgba(140,181,255,0.6)] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: duration > 0 ? `calc(${(currentTime / duration) * 100}% - 6px)` : '-6px' }}
                    />
                  </div>

                  {/* Time */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#4a5f8a]">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Play/pause inline */}
                  <button
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (isAudioPlaying) {
                        audioRef.current.pause();
                      } else {
                        if (currentTrackIndex === null) {
                          handlePlayAll();
                        } else {
                          void audioRef.current.play();
                        }
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3b8a] py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(26,59,138,0.4)] transition hover:bg-[#1f4aab]"
                  >
                    {isAudioPlaying ? (
                      <>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                        Pausar
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        {currentTrackIndex === null ? 'Reproducir' : 'Continuar'}
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-[#3d5278]">
                  La cola automática avanza sola por toda la biblioteca.
                </p>

                {message && (
                  <div className="rounded-xl border border-[#2a3b64] bg-[#0d1835] p-3">
                    <p className="text-sm text-[#b0c4e8]">{message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}