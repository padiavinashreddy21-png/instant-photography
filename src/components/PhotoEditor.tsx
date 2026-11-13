import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Crop,
  Download,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CapturedPhoto,
  CropAspectRatio,
  CropRect,
  FilterPresetId,
  PhotoAdjustments,
  PhotoEditState,
} from '../types/photo';
import {
  buildMeaningfulFilename,
  DEFAULT_EDIT_STATE,
  exportEditedPhoto,
  FILTER_PRESETS,
  loadImageElement,
  renderEditedCanvas,
  renderEditedDataUrl,
  triggerBlobDownload,
} from '../utils/canvasProcessor';
import {
  createPhotoFromSample,
  STUDIO_SAMPLES,
  StudioSample,
} from '../utils/samplePhotos';

interface PhotoEditorProps {
  photos: CapturedPhoto[];
  selectedPhoto: CapturedPhoto | null;
  onSelectPhoto: (photoId: string) => void;
  onUpdatePhoto: (
    photoId: string,
    editState: PhotoEditState,
    editedDataUrl: string
  ) => void;
  onDeletePhoto: (photoId: string) => void;
  onRetake: () => void;
  onPhotoImported: (photo: CapturedPhoto) => void;
}

type EditorTab = 'filters' | 'adjust' | 'transform';

const ASPECT_OPTIONS: {
  id: CropAspectRatio;
  label: string;
  ratio: number | null;
}[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
];

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  photos,
  selectedPhoto,
  onSelectPhoto,
  onUpdatePhoto,
  onDeletePhoto,
  onRetake,
  onPhotoImported,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<{ id: string; img: HTMLImageElement } | null>(
    null
  );

  const [activeTab, setActiveTab] = useState<EditorTab>('filters');
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [filterThumbs, setFilterThumbs] = useState<
    Partial<Record<FilterPresetId, string>>
  >({});

  // Interactive crop mode state
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropAspect, setCropAspect] = useState<CropAspectRatio>('free');
  const [draftCrop, setDraftCrop] = useState<CropRect>({
    x: 0.08,
    y: 0.08,
    width: 0.84,
    height: 0.84,
  });
  const [uncroppedPreviewUrl, setUncroppedPreviewUrl] = useState<string>('');

  const dragStateRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  // Generate real mini-thumbnails for all 8 filter presets when active photo changes
  useEffect(() => {
    let cancelled = false;
    if (!selectedPhoto) {
      setFilterThumbs({});
      return;
    }

    const buildThumbs = async () => {
      try {
        const img = await loadImageElement(selectedPhoto.originalDataUrl);
        if (cancelled) return;
        const map: Partial<Record<FilterPresetId, string>> = {};
        for (const preset of FILTER_PRESETS) {
          const thumbState: PhotoEditState = {
            ...DEFAULT_EDIT_STATE,
            filter: preset.id,
            rotation: selectedPhoto.editState.rotation,
            flipH: selectedPhoto.editState.flipH,
            flipV: selectedPhoto.editState.flipV,
            adjustments: { ...DEFAULT_EDIT_STATE.adjustments },
          };
          const canvas = renderEditedCanvas(img, thumbState, 160);
          map[preset.id] = canvas.toDataURL('image/jpeg', 0.78);
        }
        if (!cancelled) {
          setFilterThumbs(map);
        }
      } catch {
        // Ignore thumbnail generation error
      }
    };

    buildThumbs();
    return () => {
      cancelled = true;
    };
  }, [
    selectedPhoto?.id,
    selectedPhoto?.editState.rotation,
    selectedPhoto?.editState.flipH,
    selectedPhoto?.editState.flipV,
  ]);

  // Render live canvas whenever selectedPhoto or its editState changes
  useEffect(() => {
    let cancelled = false;
    if (!selectedPhoto) return;

    const draw = async () => {
      try {
        let img: HTMLImageElement;
        if (loadedImageRef.current?.id === selectedPhoto.id) {
          img = loadedImageRef.current.img;
        } else {
          img = await loadImageElement(selectedPhoto.originalDataUrl);
          if (cancelled) return;
          loadedImageRef.current = { id: selectedPhoto.id, img };
        }

        const effectiveState = compareOriginal
          ? {
              ...DEFAULT_EDIT_STATE,
              rotation: selectedPhoto.editState.rotation,
              flipH: selectedPhoto.editState.flipH,
              flipV: selectedPhoto.editState.flipV,
              crop: selectedPhoto.editState.crop,
            }
          : selectedPhoto.editState;

        const rendered = renderEditedCanvas(img, effectiveState, 1200);
        const target = previewCanvasRef.current;
        if (!target || cancelled) return;

        target.width = rendered.width;
        target.height = rendered.height;
        const ctx = target.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, target.width, target.height);
          ctx.drawImage(rendered, 0, 0);
        }
      } catch {
        // Ignore transient decode failure
      }
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [selectedPhoto, compareOriginal]);

  // Generate uncropped preview when entering Crop Mode
  useEffect(() => {
    let cancelled = false;
    if (!isCropMode || !selectedPhoto) return;

    const buildUncropped = async () => {
      const stateWithoutCrop: PhotoEditState = {
        ...selectedPhoto.editState,
        crop: null,
      };
      const res = await renderEditedDataUrl(
        selectedPhoto.originalDataUrl,
        stateWithoutCrop,
        1100
      );
      if (!cancelled) {
        setUncroppedPreviewUrl(res.dataUrl);
      }
    };
    buildUncropped();
    return () => {
      cancelled = true;
    };
  }, [isCropMode, selectedPhoto]);

  const commitEditState = useCallback(
    async (nextState: PhotoEditState) => {
      if (!selectedPhoto) return;
      const { dataUrl } = await renderEditedDataUrl(
        selectedPhoto.originalDataUrl,
        nextState,
        1100
      );
      onUpdatePhoto(selectedPhoto.id, nextState, dataUrl);
    },
    [onUpdatePhoto, selectedPhoto]
  );

  const handleFilterChange = (filterId: FilterPresetId) => {
    if (!selectedPhoto) return;
    commitEditState({
      ...selectedPhoto.editState,
      filter: filterId,
    });
  };

  const handleAdjustmentChange = (
    key: keyof PhotoAdjustments,
    value: number
  ) => {
    if (!selectedPhoto) return;
    commitEditState({
      ...selectedPhoto.editState,
      adjustments: {
        ...selectedPhoto.editState.adjustments,
        [key]: value,
      },
    });
  };

  const handleRotate = (delta: 90 | -90) => {
    if (!selectedPhoto) return;
    const nextRot = ((((selectedPhoto.editState.rotation + delta) % 360) +
      360) %
      360) as 0 | 90 | 180 | 270;
    commitEditState({
      ...selectedPhoto.editState,
      rotation: nextRot,
      crop: null,
    });
  };

  const handleFlip = (axis: 'h' | 'v') => {
    if (!selectedPhoto) return;
    commitEditState({
      ...selectedPhoto.editState,
      flipH:
        axis === 'h'
          ? !selectedPhoto.editState.flipH
          : selectedPhoto.editState.flipH,
      flipV:
        axis === 'v'
          ? !selectedPhoto.editState.flipV
          : selectedPhoto.editState.flipV,
      crop: null,
    });
  };

  const handleResetAll = () => {
    if (!selectedPhoto) return;
    setIsCropMode(false);
    commitEditState({
      ...DEFAULT_EDIT_STATE,
      adjustments: { ...DEFAULT_EDIT_STATE.adjustments },
    });
  };

  const enterCropMode = () => {
    if (!selectedPhoto) return;
    setDraftCrop(
      selectedPhoto.editState.crop ?? {
        x: 0.08,
        y: 0.08,
        width: 0.84,
        height: 0.84,
      }
    );
    setCropAspect('free');
    setIsCropMode(true);
  };

  const applyAspectPreset = (aspectId: CropAspectRatio) => {
    setCropAspect(aspectId);
    const opt = ASPECT_OPTIONS.find((o) => o.id === aspectId);
    if (!opt || !opt.ratio || !cropStageRef.current) return;

    const stageRect = cropStageRef.current.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    const stageRatio = stageRect.width / stageRect.height;
    const normAspect = opt.ratio / stageRatio;
    let w = 0.8;
    let h = w / normAspect;
    if (h > 0.85) {
      h = 0.85;
      w = h * normAspect;
    }
    if (w > 0.85) {
      w = 0.85;
      h = w / normAspect;
    }

    setDraftCrop({
      x: (1 - w) / 2,
      y: (1 - h) / 2,
      width: w,
      height: h,
    });
  };

  const handleCropPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...draftCrop },
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    const stage = cropStageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    const s = drag.startCrop;
    const minSize = 0.12;

    if (drag.mode === 'move') {
      const nx = Math.max(0, Math.min(1 - s.width, s.x + dx));
      const ny = Math.max(0, Math.min(1 - s.height, s.y + dy));
      setDraftCrop({ ...s, x: nx, y: ny });
      return;
    }

    let left = s.x;
    let top = s.y;
    let right = s.x + s.width;
    let bottom = s.y + s.height;

    if (drag.mode === 'nw' || drag.mode === 'sw') {
      left = Math.max(0, Math.min(right - minSize, s.x + dx));
    }
    if (drag.mode === 'ne' || drag.mode === 'se') {
      right = Math.min(1, Math.max(left + minSize, s.x + s.width + dx));
    }
    if (drag.mode === 'nw' || drag.mode === 'ne') {
      top = Math.max(0, Math.min(bottom - minSize, s.y + dy));
    }
    if (drag.mode === 'sw' || drag.mode === 'se') {
      bottom = Math.min(1, Math.max(top + minSize, s.y + s.height + dy));
    }

    let w = right - left;
    let h = bottom - top;

    const opt = ASPECT_OPTIONS.find((o) => o.id === cropAspect);
    if (opt?.ratio) {
      const stageRatio = rect.width / rect.height;
      const normAspect = opt.ratio / stageRatio;
      h = w / normAspect;
      if (top + h > 1) {
        h = 1 - top;
        w = h * normAspect;
      }
      if (left + w > 1) {
        w = 1 - left;
        h = w / normAspect;
      }
    }

    setDraftCrop({
      x: left,
      y: top,
      width: Math.max(minSize, w),
      height: Math.max(minSize, h),
    });
  };

  const handleCropPointerUp = () => {
    dragStateRef.current = null;
  };

  const handleCommitCrop = async () => {
    if (!selectedPhoto) return;
    await commitEditState({
      ...selectedPhoto.editState,
      crop: draftCrop,
    });
    setIsCropMode(false);
  };

  const handleClearCrop = async () => {
    if (!selectedPhoto) return;
    await commitEditState({
      ...selectedPhoto.editState,
      crop: null,
    });
    setIsCropMode(false);
  };

  const handleDownload = async () => {
    if (!selectedPhoto) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await exportEditedPhoto(
        selectedPhoto,
        exportFormat,
        customFilename
      );
      triggerBlobDownload(blob, filename);
      setDownloadFeedback(`Downloaded ${filename}`);
      window.setTimeout(() => setDownloadFeedback(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const photo: CapturedPhoto = {
          id: `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          originalDataUrl: dataUrl,
          editedDataUrl: dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          capturedAt: new Date().toISOString(),
          source: 'upload',
          cameraLabel: file.name,
          editState: {
            ...DEFAULT_EDIT_STATE,
            adjustments: { ...DEFAULT_EDIT_STATE.adjustments },
          },
        };
        onPhotoImported(photo);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePickSample = async (sample: StudioSample) => {
    const photo = await createPhotoFromSample(sample, false);
    onPhotoImported(photo);
  };

  // Empty State when no photo exists in session yet
  if (!selectedPhoto) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadFile}
          className="hidden"
        />
        <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-violet-400">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <h1 className="font-display mt-5 text-2xl font-bold text-white sm:text-3xl">
            Photo Editor is ready for your frame
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            Capture a photograph in the Camera Studio, import a local file, or
            load one of the studio sample studies below to try all filters and
            tools immediately.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              <Camera className="h-4 w-4" />
              <span>Open Camera Studio</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500"
            >
              <Upload className="h-4 w-4" />
              <span>Import Photo</span>
            </button>
          </div>

          {/* Quick Sample Picker */}
          <div className="mx-auto mt-12 max-w-4xl border-t border-zinc-800/80 pt-8 text-left">
            <p className="text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Or test with a studio sample frame
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STUDIO_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handlePickSample(sample)}
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-left transition-colors hover:border-violet-500"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-black">
                    <img
                      src={sample.src}
                      alt={sample.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-medium text-white">
                      {sample.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const suggestedFilename = buildMeaningfulFilename(
    selectedPhoto,
    exportFormat,
    customFilename
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadFile}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
            HTML5 Canvas Darkroom
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white">
            Photo Editor
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Retake</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Edits</span>
          </button>

          <button
            type="button"
            onClick={() => onDeletePhoto(selectedPhoto.id)}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Editor Workspace Split */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left 7 columns: Canvas Stage + Filmstrip */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0B0B10]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums text-zinc-200">
                  {selectedPhoto.width}×{selectedPhoto.height}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {
                    FILTER_PRESETS.find(
                      (f) => f.id === selectedPhoto.editState.filter
                    )?.label
                  }
                </span>
                {selectedPhoto.editState.crop && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-violet-400">Cropped</span>
                  </>
                )}
              </div>

              {!isCropMode && (
                <button
                  type="button"
                  onMouseDown={() => setCompareOriginal(true)}
                  onMouseUp={() => setCompareOriginal(false)}
                  onMouseLeave={() => setCompareOriginal(false)}
                  onTouchStart={() => setCompareOriginal(true)}
                  onTouchEnd={() => setCompareOriginal(false)}
                  onClick={() => setCompareOriginal((p) => !p)}
                  aria-pressed={compareOriginal}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    compareOriginal
                      ? 'border-violet-500 bg-violet-600/20 text-white'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>
                    {compareOriginal ? 'Showing Original' : 'Compare Original'}
                  </span>
                </button>
              )}
            </div>

            {/* Canvas or Interactive Cropper Stage */}
            <div className="flex min-h-[340px] items-center justify-center bg-black p-4 sm:min-h-[460px]">
              {!isCropMode ? (
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[480px] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div
                  ref={cropStageRef}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  className="relative inline-block max-h-[460px] select-none touch-none"
                >
                  {uncroppedPreviewUrl && (
                    <img
                      src={uncroppedPreviewUrl}
                      alt="Crop frame"
                      draggable={false}
                      className="block max-h-[460px] max-w-full rounded object-contain opacity-45"
                    />
                  )}

                  {/* Active Crop Window */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                    style={{
                      left: `${draftCrop.x * 100}%`,
                      top: `${draftCrop.y * 100}%`,
                      width: `${draftCrop.width * 100}%`,
                      height: `${draftCrop.height * 100}%`,
                    }}
                    className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/30" />
                    <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/30" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/30" />
                    <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/30" />

                    <button
                      type="button"
                      aria-label="Resize top-left crop corner"
                      onPointerDown={(e) => handleCropPointerDown(e, 'nw')}
                      className="absolute -top-2 -left-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-black bg-violet-500"
                    />
                    <button
                      type="button"
                      aria-label="Resize top-right crop corner"
                      onPointerDown={(e) => handleCropPointerDown(e, 'ne')}
                      className="absolute -top-2 -right-2 h-4 w-4 cursor-nesw-resize rounded-sm border border-black bg-violet-500"
                    />
                    <button
                      type="button"
                      aria-label="Resize bottom-left crop corner"
                      onPointerDown={(e) => handleCropPointerDown(e, 'sw')}
                      className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize rounded-sm border border-black bg-violet-500"
                    />
                    <button
                      type="button"
                      aria-label="Resize bottom-right crop corner"
                      onPointerDown={(e) => handleCropPointerDown(e, 'se')}
                      className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-black bg-violet-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Crop Mode Action Bar */}
            {isCropMode && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-[#0E0E14] px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {ASPECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => applyAspectPreset(opt.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        cropAspect === opt.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCropMode(false)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitCrop}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Apply Crop</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Session Filmstrip Switcher */}
          {photos.length > 1 && (
            <div className="rounded-xl border border-zinc-800 bg-[#0B0B10] p-3">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Session Filmstrip ({photos.length})
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {photos.map((p) => {
                  const isCurrent = p.id === selectedPhoto.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setIsCropMode(false);
                        onSelectPhoto(p.id);
                      }}
                      className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        isCurrent
                          ? 'border-violet-500 opacity-100'
                          : 'border-zinc-800 opacity-65 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={p.editedDataUrl}
                        alt="Session thumbnail"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 5 columns: Controls + Export Deck */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-5">
            {/* Segmented Tool Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('filters')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'filters'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Filters</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'adjust'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Adjust</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transform')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'transform'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Crop className="h-3.5 w-3.5" />
                <span>Crop &amp; Turn</span>
              </button>
            </div>

            {/* Tab Panel: Real Photo Filter Previews */}
            {activeTab === 'filters' && (
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {FILTER_PRESETS.map((preset) => {
                  const isActive = selectedPhoto.editState.filter === preset.id;
                  const thumbSrc = filterThumbs[preset.id];
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleFilterChange(preset.id)}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                        isActive
                          ? 'border-violet-500 bg-violet-600/15'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                      }`}
                    >
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={`${preset.label} preview`}
                          className="h-11 w-12 shrink-0 rounded-lg object-cover bg-black"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`h-11 w-12 shrink-0 rounded-lg bg-gradient-to-br ${preset.swatchClass}`}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-white">
                          {preset.label}
                        </div>
                        <div className="truncate text-[11px] text-zinc-400">
                          {preset.toneNote}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab Panel: Adjustments */}
            {activeTab === 'adjust' && (
              <div className="mt-5 space-y-5">
                {(
                  [
                    {
                      key: 'brightness',
                      label: 'Brightness',
                      min: -100,
                      max: 100,
                    },
                    {
                      key: 'contrast',
                      label: 'Contrast',
                      min: -100,
                      max: 100,
                    },
                    {
                      key: 'saturation',
                      label: 'Saturation',
                      min: -100,
                      max: 100,
                    },
                    {
                      key: 'vignette',
                      label: 'Vignette',
                      min: 0,
                      max: 100,
                    },
                  ] as const
                ).map((item) => {
                  const val = selectedPhoto.editState.adjustments[item.key];
                  return (
                    <div key={item.key}>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <label
                          htmlFor={`slider-${item.key}`}
                          className="font-medium text-zinc-200"
                        >
                          {item.label}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-zinc-400">
                            {val > 0 ? `+${val}` : val}
                          </span>
                          {val !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleAdjustmentChange(item.key, 0)}
                              className="text-[11px] text-violet-400 hover:text-violet-300"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        id={`slider-${item.key}`}
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={val}
                        onChange={(e) =>
                          handleAdjustmentChange(item.key, Number(e.target.value))
                        }
                        className="studio-slider w-full"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab Panel: Rotate, Flip & Crop */}
            {activeTab === 'transform' && (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="mb-2.5 text-xs font-medium text-zinc-300">
                    Orientation
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleRotate(-90)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Rotate Left 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotate(90)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Rotate Right 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlip('h')}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                        selectedPhoto.editState.flipH
                          ? 'border-violet-500 bg-violet-600/20 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600'
                      }`}
                    >
                      <FlipHorizontal2 className="h-3.5 w-3.5" />
                      <span>Flip Horizontal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlip('v')}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                        selectedPhoto.editState.flipV
                          ? 'border-violet-500 bg-violet-600/20 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600'
                      }`}
                    >
                      <FlipVertical2 className="h-3.5 w-3.5" />
                      <span>Flip Vertical</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <p className="mb-2.5 text-xs font-medium text-zinc-300">
                    Framing &amp; Crop
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={enterCropMode}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-white"
                    >
                      <Crop className="h-3.5 w-3.5" />
                      <span>
                        {selectedPhoto.editState.crop
                          ? 'Adjust Crop Frame'
                          : 'Open Crop Tool'}
                      </span>
                    </button>
                    {selectedPhoto.editState.crop && (
                      <button
                        type="button"
                        onClick={handleClearCrop}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
                      >
                        Clear Crop
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export / Download Card */}
          <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-5">
            <h2 className="font-display text-base font-semibold text-white">
              Export Photograph
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <span className="mb-2 block text-xs font-medium text-zinc-300">
                  File Format
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('jpeg')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      exportFormat === 'jpeg'
                        ? 'border-violet-500 bg-violet-600/20 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    JPG (High Quality)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('png')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      exportFormat === 'png'
                        ? 'border-violet-500 bg-violet-600/20 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="export-filename"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Filename (optional)
                </label>
                <input
                  id="export-filename"
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="Leave blank for automatic timestamp name"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                />
                <p className="mt-1.5 truncate font-mono text-[11px] text-zinc-500">
                  Output: {suggestedFilename}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isExporting
                    ? 'Rendering Full Resolution...'
                    : `Download ${exportFormat === 'png' ? 'PNG' : 'JPG'}`}
                </span>
              </button>

              {downloadFeedback && (
                <p
                  role="status"
                  className="flex items-center gap-1.5 text-xs text-violet-300"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{downloadFeedback}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
