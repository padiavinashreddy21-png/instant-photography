import React, { useEffect, useState } from 'react';
import {
  Camera,
  Download,
  Maximize2,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { CapturedPhoto } from '../types/photo';
import {
  exportEditedPhoto,
  FILTER_PRESETS,
  triggerBlobDownload,
} from '../utils/canvasProcessor';

interface SessionGalleryProps {
  photos: CapturedPhoto[];
  onEditPhoto: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onClearAll: () => void;
  onOpenStudio: () => void;
}

export const SessionGallery: React.FC<SessionGalleryProps> = ({
  photos,
  onEditPhoto,
  onDeletePhoto,
  onClearAll,
  onOpenStudio,
}) => {
  const [filterSource, setFilterSource] = useState<'all' | 'camera' | 'upload'>(
    'all'
  );
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  const visiblePhotos = photos.filter((p) =>
    filterSource === 'all' ? true : p.source === filterSource
  );

  const lightboxPhoto =
    photos.find((p) => p.id === lightboxPhotoId) ?? null;

  useEffect(() => {
    if (!lightboxPhoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxPhotoId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxPhoto]);

  const handleDownload = async (
    photo: CapturedPhoto,
    format: 'jpeg' | 'png'
  ) => {
    const { blob, filename } = await exportEditedPhoto(photo, format);
    triggerBlobDownload(blob, filename);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
            Current Session Roll
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white">
            Session Gallery
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Photographs captured or imported during this browser session stay
            locally in memory until you download or clear them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {photos.length > 0 && (
            <>
              <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'camera', label: 'Camera' },
                    { id: 'upload', label: 'Imported' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterSource(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterSource === tab.id
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Roll</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenStudio}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Take New Photo</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#0B0B10] px-6 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-violet-400">
            <Camera className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-5 text-xl font-semibold text-white">
            Your session gallery is empty
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Every photograph you capture in Camera Studio or import into the
            editor appears here automatically for quick comparison and export.
          </p>
          <button
            type="button"
            onClick={onOpenStudio}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            <Camera className="h-4 w-4" />
            <span>Open Camera Studio</span>
          </button>
        </div>
      ) : visiblePhotos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#0B0B10] px-6 py-14 text-center">
          <p className="text-sm text-zinc-400">
            No photos match the selected source filter.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePhotos.map((photo, index) => {
            const filterName =
              FILTER_PRESETS.find((f) => f.id === photo.editState.filter)
                ?.label ?? 'Original';
            const capturedTime = new Date(photo.capturedAt).toLocaleTimeString(
              [],
              { hour: '2-digit', minute: '2-digit' }
            );

            return (
              <article
                key={photo.id}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-[#0B0B10] transition-colors hover:border-zinc-700"
              >
                {/* Thumbnail Stage */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                  <img
                    src={photo.editedDataUrl}
                    alt={`Session photograph ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxPhotoId(photo.id)}
                    aria-label="Inspect full photograph"
                    className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/75 text-white opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100 hover:bg-violet-600"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Card Details (Unboxed metadata with · separator) */}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-sm font-semibold text-white">
                      Frame {String(visiblePhotos.length - index).padStart(2, '0')}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-zinc-400">
                      {photo.width}×{photo.height}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                    <span>{filterName}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {photo.source === 'camera' ? 'Camera' : 'Imported'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{capturedTime}</span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-zinc-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => onEditPhoto(photo.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(photo, 'jpeg')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>JPG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeletePhoto(photo.id)}
                      aria-label="Delete photograph"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photograph lightbox viewer"
          onClick={() => setLightboxPhotoId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0B0B10]"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="font-display text-sm font-semibold text-white">
                  Full Resolution Preview
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {lightboxPhoto.width}×{lightboxPhoto.height}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhotoId(null)}
                aria-label="Close lightbox"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto bg-black p-4">
              <img
                src={lightboxPhoto.editedDataUrl}
                alt="Full resolution preview"
                className="max-h-[70vh] max-w-full rounded object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3.5">
              <span className="text-xs text-zinc-400">
                Captured{' '}
                {new Date(lightboxPhoto.capturedAt).toLocaleString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = lightboxPhoto.id;
                    setLightboxPhotoId(null);
                    onEditPhoto(id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Open in Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(lightboxPhoto, 'jpeg')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download JPG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(lightboxPhoto, 'png')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
