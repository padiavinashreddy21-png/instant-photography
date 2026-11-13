import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  Download,
  FlipHorizontal2,
  Grid3X3,
  RefreshCw,
  SlidersHorizontal,
  Timer,
  Trash2,
  Upload,
  Zap,
  ZapOff,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { CapturedPhoto } from '../types/photo';
import {
  DEFAULT_EDIT_STATE,
  exportEditedPhoto,
  triggerBlobDownload,
} from '../utils/canvasProcessor';

interface CameraStudioProps {
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onOpenEditor: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  latestCapturedPhoto: CapturedPhoto | null;
}

type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'error'
  | 'unsupported';

interface CameraErrorInfo {
  title: string;
  message: string;
  hint: string;
}

function mapCameraError(err: unknown): CameraErrorInfo {
  const domErr = err as { name?: string; message?: string };
  const name = domErr?.name ?? '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      title: 'Camera permission denied',
      message:
        'Browser access to your camera was blocked or dismissed. Grant camera permission to preview and capture live photos.',
      hint: 'Click the camera or lock icon in your browser address bar, set Camera to Allow, and retry.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      title: 'No camera device found',
      message:
        'No physical or virtual webcam was detected by your browser on this device.',
      hint: 'Connect a webcam or upload an existing image below to continue into the Photo Editor.',
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      title: 'Camera is busy',
      message:
        'Your camera appears to be in use by another application or browser tab.',
      hint: 'Close video conferencing apps or other camera tabs, then click Retry Camera.',
    };
  }
  if (name === 'SecurityError') {
    return {
      title: 'Secure context required',
      message:
        'Camera access requires HTTPS or a localhost origin.',
      hint: 'Open this application over https:// or http://localhost.',
    };
  }
  return {
    title: 'Unable to start camera',
    message:
      domErr?.message ||
      'An unexpected hardware or browser error occurred while initializing the camera.',
    hint: 'Verify your device privacy settings and try again.',
  };
}

export const CameraStudio: React.FC<CameraStudioProps> = ({
  onPhotoCaptured,
  onOpenEditor,
  onDeletePhoto,
  latestCapturedPhoto,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorInfo, setErrorInfo] = useState<CameraErrorInfo | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [resolution, setResolution] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [showScreenFlashOverlay, setShowScreenFlashOverlay] = useState(false);

  const [showGrid, setShowGrid] = useState(true);
  const [mirrorPreview, setMirrorPreview] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [justCapturedId, setJustCapturedId] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCountdown(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchSupported(false);
    setTorchEnabled(false);
    setResolution({ w: 0, h: 0 });
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
    } catch {
      // Ignore enumeration errors
    }
  }, []);

  const startCamera = useCallback(
    async (opts?: { facing?: 'user' | 'environment'; deviceId?: string }) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('unsupported');
        setErrorInfo({
          title: 'MediaDevices API unavailable',
          message:
            'This browser environment does not support navigator.mediaDevices.getUserMedia.',
          hint: 'Use a modern Chrome, Edge, Firefox, or Safari browser over HTTPS or localhost.',
        });
        return;
      }

      stopStream();
      setStatus('requesting');
      setErrorInfo(null);

      const targetFacing = opts?.facing ?? facingMode;
      const targetDeviceId = opts?.deviceId;

      const videoConstraints: MediaTrackConstraints = targetDeviceId
        ? {
            deviceId: { exact: targetDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        : {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch (constraintErr) {
          // Fallback if strict ideal/deviceId fails
          const errName = (constraintErr as { name?: string })?.name;
          if (
            errName === 'OverconstrainedError' ||
            errName === 'ConstraintNotSatisfiedError'
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw constraintErr;
          }
        }

        streamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings?.();
          if (settings?.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
          if (settings?.facingMode === 'environment') {
            setFacingMode('environment');
            setMirrorPreview(false);
          } else if (settings?.facingMode === 'user') {
            setFacingMode('user');
            setMirrorPreview(true);
          }

          // Check hardware torch/flash capability
          const caps = (
            videoTrack.getCapabilities
              ? videoTrack.getCapabilities()
              : {}
          ) as MediaTrackCapabilities & { torch?: boolean };
          setTorchSupported(Boolean(caps?.torch));
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('active');
        await refreshDevices();
      } catch (err) {
        stopStream();
        setStatus('error');
        setErrorInfo(mapCameraError(err));
      }
    },
    [facingMode, refreshDevices, stopStream]
  );

  // Stop camera cleanly when unmounting Studio
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchEnabled;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchEnabled(next);
    } catch {
      setTorchSupported(false);
      setTorchEnabled(false);
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length > 1 && selectedDeviceId) {
      const idx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextDevice = devices[(idx + 1) % devices.length];
      setSelectedDeviceId(nextDevice.deviceId);
      const labelLower = nextDevice.label.toLowerCase();
      const isBack =
        labelLower.includes('back') ||
        labelLower.includes('rear') ||
        labelLower.includes('environment');
      setMirrorPreview(!isBack);
      startCamera({ deviceId: nextDevice.deviceId });
      return;
    }

    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setMirrorPreview(nextFacing === 'user');
    startCamera({ facing: nextFacing });
  };

  const executeFrameCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (mirrorPreview) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const activeTrack = streamRef.current?.getVideoTracks()[0];
    const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const captured: CapturedPhoto = {
      id,
      originalDataUrl: dataUrl,
      editedDataUrl: dataUrl,
      width: canvas.width,
      height: canvas.height,
      capturedAt: new Date().toISOString(),
      source: 'camera',
      cameraLabel: activeTrack?.label || 'Device Camera',
      editState: {
        ...DEFAULT_EDIT_STATE,
        adjustments: { ...DEFAULT_EDIT_STATE.adjustments },
      },
    };

    setShutterFlash(true);
    window.setTimeout(() => setShutterFlash(false), 240);
    setJustCapturedId(id);
    onPhotoCaptured(captured);
  }, [mirrorPreview, onPhotoCaptured]);

  const handleCaptureClick = useCallback(() => {
    if (status !== 'active') return;

    // Cancel active countdown if clicked again
    if (countdown !== null) {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setCountdown(null);
      return;
    }

    const triggerWithFlash = () => {
      if (screenFlash && !torchSupported) {
        setShowScreenFlashOverlay(true);
        window.setTimeout(() => {
          executeFrameCapture();
          window.setTimeout(() => setShowScreenFlashOverlay(false), 180);
        }, 120);
      } else {
        executeFrameCapture();
      }
    };

    if (timerSeconds === 0) {
      triggerWithFlash();
      return;
    }

    let remaining = timerSeconds;
    setCountdown(remaining);
    timerIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (timerIntervalRef.current !== null) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setCountdown(null);
        triggerWithFlash();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [
    countdown,
    executeFrameCapture,
    screenFlash,
    status,
    timerSeconds,
    torchSupported,
  ]);

  // Spacebar shutter shortcut when camera is live
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        status === 'active' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'BUTTON'
      ) {
        e.preventDefault();
        handleCaptureClick();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCaptureClick, status]);

  const handleUploadLocalPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a valid image file (JPG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const id = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const photo: CapturedPhoto = {
          id,
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
        setJustCapturedId(id);
        onPhotoCaptured(photo);
      };
      img.onerror = () => {
        setUploadError('Could not decode the selected image file.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickDownload = async (photo: CapturedPhoto) => {
    const { blob, filename } = await exportEditedPhoto(photo, 'jpeg');
    triggerBlobDownload(blob, filename);
  };

  const activeCapture =
    latestCapturedPhoto &&
    (justCapturedId === latestCapturedPhoto.id || status !== 'active')
      ? latestCapturedPhoto
      : latestCapturedPhoto;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
            Live Viewfinder
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white">
            Camera Studio
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Grant camera permission to preview live hardware video and capture
            full-resolution frames.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadLocalPhoto}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Image</span>
          </button>

          {status === 'active' ? (
            <button
              type="button"
              onClick={() => {
                stopStream();
                setStatus('idle');
              }}
              className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-red-500/60 hover:text-red-300"
            >
              <CameraOff className="h-3.5 w-3.5" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera()}
              disabled={status === 'requesting'}
              className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>
                {status === 'requesting' ? 'Requesting Access...' : 'Enable Camera'}
              </span>
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left 8 columns: Viewfinder + Shutter Deck */}
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0B0B10]">
            {/* Top Telemetry Bar (Real camera state only) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="font-medium text-zinc-200">
                  {status === 'active'
                    ? 'Live Hardware Feed'
                    : status === 'requesting'
                    ? 'Awaiting Permission'
                    : status === 'error' || status === 'unsupported'
                    ? 'Camera Unavailable'
                    : 'Camera Standby'}
                </span>
                {resolution.w > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-zinc-300">
                      {resolution.w}×{resolution.h}
                    </span>
                  </>
                )}
              </div>

              {devices.length > 1 && status === 'active' && (
                <select
                  aria-label="Select camera device"
                  value={selectedDeviceId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedDeviceId(nextId);
                    startCamera({ deviceId: nextId });
                  }}
                  className="max-w-[220px] truncate rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
                >
                  {devices.map((dev, i) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Viewfinder Canvas */}
            <div className="relative aspect-[4/3] w-full bg-black sm:aspect-[16/10]">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setResolution({
                      w: videoRef.current.videoWidth,
                      h: videoRef.current.videoHeight,
                    });
                  }
                }}
                className={`h-full w-full object-cover ${
                  status === 'active' ? 'block' : 'hidden'
                } ${mirrorPreview ? '-scale-x-100' : ''}`}
              />

              {/* Rule of Thirds Overlay */}
              {status === 'active' && showGrid && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/15" />
                </div>
              )}

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45">
                  <span className="font-display tabular-nums text-7xl font-bold text-white">
                    {countdown}
                  </span>
                  <span className="mt-2 text-xs font-medium text-zinc-200">
                    Click shutter again to cancel
                  </span>
                </div>
              )}

              {/* Shutter Flash Feedback */}
              {shutterFlash && (
                <div
                  aria-hidden="true"
                  className="animate-shutter-flash pointer-events-none absolute inset-0 bg-white"
                />
              )}

              {/* Screen Flash Illumination Overlay */}
              {showScreenFlashOverlay && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none fixed inset-0 z-50 bg-white"
                />
              )}

              {/* Idle / Requesting / Error States (Genuine, never fake preview) */}
              {status !== 'active' && (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  {status === 'requesting' && (
                    <div className="max-w-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/15 text-violet-400">
                        <Camera className="h-6 w-6" />
                      </div>
                      <h2 className="font-display mt-4 text-lg font-semibold text-white">
                        Waiting for camera permission
                      </h2>
                      <p className="mt-2 text-sm text-zinc-400">
                        Accept the browser prompt to start your live camera
                        preview.
                      </p>
                    </div>
                  )}

                  {status === 'idle' && (
                    <div className="max-w-md">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-violet-400">
                        <Camera className="h-6 w-6" />
                      </div>
                      <h2 className="font-display mt-4 text-xl font-semibold text-white">
                        Ready to open your device camera
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        Your live camera feed stays completely private inside
                        your browser. Click below to request access and begin
                        shooting.
                      </p>
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Allow &amp; Start Camera</span>
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
                    </div>
                  )}

                  {(status === 'error' || status === 'unsupported') &&
                    errorInfo && (
                      <div
                        role="alert"
                        className="max-w-md rounded-xl border border-red-500/30 bg-red-950/20 p-6"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h2 className="font-display mt-3 text-lg font-semibold text-white">
                          {errorInfo.title}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-300">
                          {errorInfo.message}
                        </p>
                        <p className="mt-2 text-xs text-zinc-400">
                          {errorInfo.hint}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                          {status !== 'unsupported' && (
                            <button
                              type="button"
                              onClick={() => startCamera()}
                              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Retry Camera</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Import Image Instead</span>
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Bottom Camera Control Deck */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/80 bg-[#0E0E14] px-4 py-4 sm:px-6">
              {/* Secondary Hardware Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  disabled={status !== 'active'}
                  title="Switch front or back camera"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Flip Lens</span>
                </button>

                {torchSupported ? (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    disabled={status !== 'active'}
                    aria-pressed={torchEnabled}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      torchEnabled
                        ? 'border-violet-500 bg-violet-600/20 text-white'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                    }`}
                  >
                    {torchEnabled ? (
                      <Zap className="h-3.5 w-3.5 text-violet-400" />
                    ) : (
                      <ZapOff className="h-3.5 w-3.5" />
                    )}
                    <span>Flash {torchEnabled ? 'On' : 'Off'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setScreenFlash((prev) => !prev)}
                    disabled={status !== 'active'}
                    aria-pressed={screenFlash}
                    title="Uses bright screen flash when hardware LED torch is unavailable"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      screenFlash
                        ? 'border-violet-500 bg-violet-600/20 text-white'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                    }`}
                  >
                    {screenFlash ? (
                      <Zap className="h-3.5 w-3.5 text-violet-400" />
                    ) : (
                      <ZapOff className="h-3.5 w-3.5" />
                    )}
                    <span>Screen Flash</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMirrorPreview((prev) => !prev)}
                  disabled={status !== 'active'}
                  aria-pressed={mirrorPreview}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    mirrorPreview
                      ? 'border-violet-500 bg-violet-600/20 text-white'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  <span>Mirror</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGrid((prev) => !prev)}
                  disabled={status !== 'active'}
                  aria-pressed={showGrid}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    showGrid
                      ? 'border-violet-500 bg-violet-600/20 text-white'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  <span>Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTimerSeconds((prev) =>
                      prev === 0 ? 3 : prev === 3 ? 10 : 0
                    )
                  }
                  disabled={status !== 'active'}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    timerSeconds > 0
                      ? 'border-violet-500 bg-violet-600/20 text-white'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" />
                  <span>{timerSeconds === 0 ? 'Timer Off' : `${timerSeconds}s`}</span>
                </button>
              </div>

              {/* Primary Shutter Button */}
              <button
                type="button"
                onClick={handleCaptureClick}
                disabled={status !== 'active'}
                aria-label="Capture photo"
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-lg transition-all duration-150 hover:bg-violet-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="h-3.5 w-3.5 rounded-full bg-violet-600" />
                <span>
                  {countdown !== null ? 'Cancel Timer' : 'Capture Photo'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 columns: Latest Capture Preview & Instant Actions */}
        <div className="lg:col-span-4">
          <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-800 bg-[#0B0B10] p-5">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <h2 className="font-display text-base font-semibold text-white">
                  Latest Capture
                </h2>
                {activeCapture && (
                  <span className="inline-flex items-center gap-1 text-xs text-violet-400">
                    <Check className="h-3.5 w-3.5" />
                    Saved to session
                  </span>
                )}
              </div>

              {activeCapture ? (
                <div className="mt-4">
                  <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
                    <img
                      src={activeCapture.editedDataUrl}
                      alt="Latest captured photograph"
                      className="aspect-[4/3] w-full object-contain"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span className="font-mono tabular-nums text-zinc-200">
                      {activeCapture.width}×{activeCapture.height}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(activeCapture.capturedAt).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                      )}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeCapture.source === 'camera' ? 'Camera' : 'Imported'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenEditor(activeCapture.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Edit &amp; Apply Filters</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleQuickDownload(activeCapture)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Save JPG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeletePhoto(activeCapture.id);
                          setJustCapturedId(null);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 px-5 py-12 text-center">
                  <Camera className="h-7 w-7 text-zinc-600" />
                  <p className="mt-3 text-sm font-medium text-zinc-300">
                    No captures yet
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    Captured frames will appear here immediately for preview,
                    retake, editing, or download.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
              Tip: Press <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-300">Space</kbd> while live to trigger the shutter.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
