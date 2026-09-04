'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const PLAY_STORAGE_KEY = 'nodebeat_last_playing';

const emptySubscribe = () => () => {};

export default function BibliotecaPage() {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [savedDownloads, setSavedDownloads] = useState<SavedDownload[]>([]);
  const [message, setMessage] = useState('');
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlayingQueue, setIsPlayingQueue] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const loadDownloads = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/downloads');
      if (!response.ok) {
        if (response.status === 401) { router.replace('/login'); return; }
        throw new Error('No se pudo cargar la biblioteca');
      }
      const data: SavedDownload[] = await response.json();
      setSavedDownloads(data);

      const last = sessionStorage.getItem(PLAY_STORAGE_KEY);
      if (last) {
        try {
          const parsed = JSON.parse(last);
          const idx = data.findIndex((d) => d.id === parsed.id);
          if (idx !== -1 && data[idx].type === 'audio') {
            setCurrentTrackIndex(idx);
            setCurrentTime(parsed.currentTime || 0);
          }
        } catch { /* ignore */ }
        sessionStorage.removeItem(PLAY_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error cargando descargas:', error);
      setMessage('No se pudo cargar la biblioteca.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => void loadDownloads(), 0);
    return () => clearTimeout(timer);
  }, [loadDownloads]);

  const audioDownloads = savedDownloads.filter((item) => item.type === 'audio');

  const filteredDownloads = searchQuery.trim()
    ? audioDownloads.filter(
        (d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.channel && d.channel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : audioDownloads;

  const currentTrack = currentTrackIndex !== null ? audioDownloads[currentTrackIndex] : null;

  const playTrack = useCallback(
    (index: number, queueMode = false) => {
      const nextTrack = audioDownloads[index];
      if (!nextTrack) return;

      if (currentTrackIndex === index && audioRef.current) {
        audioRef.current.play().catch(console.error);
        setIsAudioPlaying(true);
        setIsPlayingQueue(queueMode);
        return;
      }

      setCurrentTrackIndex(index);
      setIsPlayingQueue(queueMode);

      const fileUrl = `/api/file?path=${encodeURIComponent(nextTrack.filePath)}`;
      if (audioRef.current) {
        audioRef.current.src = fileUrl;
        audioRef.current.play().catch((error) => {
          console.error('Error playing audio:', error);
          setMessage('Error al reproducir el audio.');
        });
      }
    },
    [audioDownloads, currentTrackIndex]
  );

  const handleToggleTrack = useCallback(
    (index: number) => {
      if (currentTrackIndex === index && isAudioPlaying) {
        audioRef.current?.pause();
        return;
      }
      playTrack(index, false);
    },
    [currentTrackIndex, isAudioPlaying, playTrack],
  );

  const handlePlayAll = () => {
    if (filteredDownloads.length === 0) return;
    if (currentTrack && isAudioPlaying) {
      audioRef.current?.pause();
      setCurrentTrackIndex(null);
      setIsPlayingQueue(false);
      return;
    }
    const realIndex = audioDownloads.indexOf(filteredDownloads[0]);
    playTrack(realIndex, true);
  };

  const handlePrev = () => {
    if (currentTrackIndex === null || currentTrackIndex <= 0) return;
    playTrack(currentTrackIndex - 1, isPlayingQueue);
  };

  const handleNext = () => {
    if (currentTrackIndex === null) return;
    const next = currentTrackIndex + 1;
    if (next >= audioDownloads.length) {
      setCurrentTrackIndex(null);
      setIsPlayingQueue(false);
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      return;
    }
    playTrack(next, isPlayingQueue);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('¿Eliminar esta descarga?');
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/downloads?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar');
      setSavedDownloads((prev) => prev.filter((item) => item.id !== id));
      setMessage('Descarga eliminada.');
      if (currentTrack?.id === id) {
        setCurrentTrackIndex(null);
        setIsPlayingQueue(false);
        audioRef.current?.pause();
        if (audioRef.current) {
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current || !audioRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
    audioRef.current.volume = ratio;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      audioRef.current.volume = 0;
    } else {
      setVolume(prevVolume);
      audioRef.current.volume = prevVolume;
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (currentTrackIndex !== null) handleToggleTrack(currentTrackIndex);
        else if (filteredDownloads.length > 0) {
          const realIndex = audioDownloads.indexOf(filteredDownloads[0]);
          playTrack(realIndex, true);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentTrackIndex, filteredDownloads, audioDownloads, handleToggleTrack, playTrack]);

  return (
    <>
      <div className="pb-36 sm:pb-28">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#f0f5ff] sm:text-2xl">Biblioteca</h1>
            <p className="mt-0.5 text-xs text-[#6b82b8] sm:text-sm">{audioDownloads.length} audios guardados</p>
          </div>
          <button
            onClick={handlePlayAll}
            disabled={!hydrated || !filteredDownloads.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1a3b8a] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(26,59,138,0.35)] transition hover:bg-[#1f4aab] disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            {currentTrack && isAudioPlaying ? 'Pausar' : 'Reproducir todo'}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4 sm:mb-6">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5f8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por título o artista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-[#2a3b64] bg-[#0c1528] py-3 pl-11 pr-4 text-sm text-[#d8e4ff] placeholder-[#4a5f8a] outline-none transition focus:border-[#3a5faa] focus:ring-2 focus:ring-[#1a3b8a]/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#4a5f8a] transition hover:bg-[#1a2d50] hover:text-[#d8e4ff]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#1e2e50] bg-[#0c1528] p-3">
                <div className="aspect-square w-full rounded-xl bg-[#1a2d50]" />
                <div className="mt-3 h-3 w-3/4 rounded bg-[#1a2d50]" />
                <div className="mt-2 h-2.5 w-1/2 rounded bg-[#1a2d50]" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredDownloads.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#2d4172] bg-[#0c1528]/50 p-8 sm:p-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a2d50]">
              <svg className="h-8 w-8 text-[#4a5f8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#8fa8d8]">No hay audios aquí</p>
            <p className="mt-1 text-sm text-[#4a5f8a]">
              {searchQuery ? 'Intenta con otro término de búsqueda.' : 'Descarga tu primer audio desde el panel principal.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filteredDownloads.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredDownloads.map((download) => {
              const realIndex = audioDownloads.findIndex((d) => d.id === download.id);
              const isActive = currentTrack?.id === download.id;
              return (
                <div
                  key={download.id}
                  className={`group relative cursor-pointer rounded-xl border p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] sm:rounded-2xl sm:p-3 ${
                    isActive
                      ? 'border-[#3a5faa] bg-[#0f2045] shadow-[0_4px_20px_rgba(26,59,138,0.3)]'
                      : 'border-[#1e2e50] bg-[#0c1528] hover:border-[#2d4172] hover:bg-[#101e3a]'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#1a2d50] sm:rounded-xl">
                    {download.thumbnail ? (
                      <Image
                        src={download.thumbnail}
                        alt={download.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-[#4a6090]">♪</div>
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition duration-200 sm:group-hover:bg-black/40">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleTrack(realIndex); }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a3b8a]/90 text-white shadow-lg transition duration-200 hover:bg-[#1f4aab] hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          {isActive && isAudioPlaying ? (
                            <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                          ) : (
                            <path d="M8 5v14l11-7z" />
                          )}
                        </svg>
                      </button>
                    </div>

                    {/* Active badge */}
                    {isActive && (
                      <div className="absolute left-2 top-2 rounded-full bg-[#1a3b8a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8cb5ff] shadow-lg">
                        {isAudioPlaying ? 'Playing' : 'Pausa'}
                      </div>
                    )}

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(download.id); }}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/50 text-white/70 transition hover:bg-red-600/80 hover:text-white sm:right-2 sm:top-2 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="mt-2 space-y-0.5 sm:mt-3 sm:space-y-1">
                    <p className="truncate text-xs font-semibold text-[#d8e4ff] sm:text-sm">{download.title}</p>
                    <p className="truncate text-[10px] text-[#5a6f9a] sm:text-xs">{download.channel ?? 'Desconocido'}</p>
                    {download.duration && (
                      <p className="text-[10px] text-[#3d5278] sm:text-[11px]">{download.duration}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-[#2a3b64] bg-[#0d1835] p-3">
            <p className="text-sm text-[#b0c4e8]">{message}</p>
          </div>
        )}
      </div>

      {/* Fixed bottom player */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 overflow-hidden border-t border-[#1e2e50] bg-[#0a1020]/95 backdrop-blur-xl transition-all duration-300 ${
          currentTrack ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Mobile layout */}
        <div className="px-2 pb-2 pt-1 sm:hidden">
          <div className="flex items-center gap-1">
            <div className="relative mr-1 h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#1a2d50]">
              {currentTrack?.thumbnail ? (
                <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" sizes="36px" loading="eager" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-[#4a6090]">♪</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#d8e4ff]">{currentTrack?.title ?? ''}</p>
              <p className="truncate text-[10px] text-[#5a6f9a]">{currentTrack?.channel ?? ''}</p>
            </div>
            <button
              onClick={handlePrev}
              disabled={!hydrated || currentTrackIndex === null || currentTrackIndex <= 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8fa8d8] transition hover:text-white disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button
              onClick={() => currentTrackIndex !== null && handleToggleTrack(currentTrackIndex)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3b8a] text-white"
            >
              {isAudioPlaying ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button
              onClick={handleNext}
              disabled={!hydrated || currentTrackIndex === null}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8fa8d8] transition hover:text-white disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#4a5f8a]">{formatTime(currentTime)}</span>
            <div
              className="relative h-1.5 flex-1 cursor-pointer touch-pan-y rounded-full bg-[#1a2d50]"
              onClick={handleProgressClick}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#3a60c8]"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#4a5f8a]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden items-center px-4 py-3 sm:flex">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#1a2d50]">
              {currentTrack?.thumbnail ? (
                <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" sizes="48px" loading="eager" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg text-[#4a6090]">♪</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#d8e4ff]">{currentTrack?.title ?? ''}</p>
              <p className="truncate text-xs text-[#5a6f9a]">{currentTrack?.channel ?? ''}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!hydrated || currentTrackIndex === null || currentTrackIndex <= 0}
              className="rounded-lg p-1.5 text-[#8fa8d8] transition hover:bg-[#1a2d50] hover:text-white disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button
              onClick={() => currentTrackIndex !== null && handleToggleTrack(currentTrackIndex)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a3b8a] text-white transition hover:bg-[#1f4aab]"
            >
              {isAudioPlaying ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button
              onClick={handleNext}
              disabled={!hydrated || currentTrackIndex === null}
              className="rounded-lg p-1.5 text-[#8fa8d8] transition hover:bg-[#1a2d50] hover:text-white disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
            </button>
          </div>
          <div className="ml-4 flex items-center gap-4">
            <div className="w-32">
              <div
                className="group relative h-1 cursor-pointer rounded-full bg-[#1a2d50]"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full rounded-full bg-[#3a60c8] transition-all"
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
                <div
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(140,181,255,0.6)] opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ left: duration > 0 ? `calc(${(currentTime / duration) * 100}% - 5px)` : '-5px' }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono text-[#4a5f8a]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <button onClick={toggleMute} className="rounded-lg p-1.5 text-[#8fa8d8] transition hover:text-white">
                {volume === 0 ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <div
                ref={volumeRef}
                className="relative h-1 w-20 cursor-pointer rounded-full bg-[#1a2d50]"
                onClick={handleVolumeClick}
              >
                <div
                  className="h-full rounded-full bg-[#3a60c8]"
                  style={{ width: `${volume * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-sm"
                  style={{ left: `calc(${volume * 100}% - 5px)` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio */}
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        onEnded={() => {
          setIsAudioPlaying(false);
          if (isPlayingQueue && currentTrackIndex !== null && currentTrackIndex < audioDownloads.length - 1) {
            playTrack(currentTrackIndex + 1, true);
            return;
          }
          setCurrentTrackIndex(null);
          setIsPlayingQueue(false);
        }}
        onError={() => {
          setMessage('Error al cargar el audio. El servidor de descargas puede no estar disponible.');
        }}
      />
    </>
  );
}
