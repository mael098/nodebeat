
'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('audio');

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setMessage('Por favor ingresa una URL de YouTube');
      return;
    }

    setLoading(true);
    setMessage('⏳ Descargando, esto puede tardar varios minutos...');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600000); // 10 minutos

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: downloadType }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en la descarga');
      }

      setMessage('📥 Preparando descarga...');

      // Obtener el blob y descargar
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || `descarga.${downloadType === 'video' ? 'mp4' : 'mp3'}`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setMessage('✅ ¡Descarga completada!');
      setUrl('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMsg.includes('aborted')) {
        setMessage('❌ Timeout: La descarga tardó demasiado. Intenta de nuevo.');
      } else {
        setMessage(`❌ Error: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            NodeBeat
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <form onSubmit={handleDownload} className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL de YouTube
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>

            {/* Download Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ¿Qué descargar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDownloadType('audio')}
                  className={`py-2 px-3 rounded-lg font-medium transition ${
                    downloadType === 'audio'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  disabled={loading}
                >
                   Audio (MP3)
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadType('video')}
                  className={`py-2 px-3 rounded-lg font-medium transition ${
                    downloadType === 'video'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  disabled={loading}
                >
                   Video (MP4)
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Descargando...
                </span>
              ) : (
                <span> Descargar</span>
              )}
            </button>
          </form>

          {/* Message */}d
          {message && ( 
            <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
              <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>✨ Rápido, seguro y sin anuncios</p>
        </div>
      </div>
    </div>
  );
}
