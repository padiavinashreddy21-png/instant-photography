import React, { useState } from 'react';
import {
  ArrowRight,
  Aperture,
  SlidersHorizontal,
  Crop,
  Download,
  Camera,
} from 'lucide-react';
import { NavSection } from '../types/photo';
import {
  HERO_PORTRAIT_SRC,
  STUDIO_SAMPLES,
  StudioSample,
} from '../utils/samplePhotos';

interface HeroSectionProps {
  onStartPhotography: () => void;
  onNavigate: (section: NavSection) => void;
  onLoadSampleIntoEditor: (sample: StudioSample) => void;
  photoCount: number;
}

const LENS_STUDIES = [
  {
    id: 'original',
    label: 'Natural Sensor',
    aperture: 'f/1.4',
    shutter: '1/250s',
    iso: 'ISO 100',
    filterCss: 'none',
  },
  {
    id: 'bw',
    label: 'Black & White',
    aperture: 'f/2.0',
    shutter: '1/500s',
    iso: 'ISO 400',
    filterCss: 'grayscale(100%) contrast(1.18)',
  },
  {
    id: 'vintage-warm',
    label: 'Vintage Warm',
    aperture: 'f/2.8',
    shutter: '1/125s',
    iso: 'ISO 200',
    filterCss: 'sepia(0.32) saturate(1.22) contrast(0.96) brightness(1.04)',
  },
  {
    id: 'purple-noir',
    label: 'Purple Noir',
    aperture: 'f/1.4',
    shutter: '1/320s',
    iso: 'ISO 800',
    filterCss: 'grayscale(0.65) hue-rotate(245deg) contrast(1.22)',
  },
];

const CAPABILITY_STRIP = [
  {
    icon: Aperture,
    title: 'Live Camera Studio',
    detail:
      'Direct MediaDevices hardware stream with front/rear lens switching and torch control.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Precision Filter Suite',
    detail:
      '8 darkroom color profiles plus real-time brightness, contrast, saturation, and vignette.',
  },
  {
    icon: Crop,
    title: 'Non-Destructive Crop',
    detail:
      'Interactive aspect-ratio framing, 90° step rotation, and horizontal or vertical mirroring.',
  },
  {
    icon: Download,
    title: 'Full-Res Export',
    detail:
      'One-click high-quality JPG and lossless PNG downloads processed directly in your browser.',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartPhotography,
  onNavigate,
  onLoadSampleIntoEditor,
  photoCount,
}) => {
  const [studyIndex, setStudyIndex] = useState(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedSamples, setFailedSamples] = useState<Record<string, boolean>>(
    {}
  );
  const currentStudy = LENS_STUDIES[studyIndex];

  return (
    <section className="relative overflow-hidden">
      {/* Subtle Studio Rim Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[520px] w-[520px] rounded-full bg-violet-700/12 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-8 lg:pt-14 lg:pb-20">
        {/* Split-screen Hero */}
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Typography + Primary CTA */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
              Browser Darkroom &amp; Camera Studio
            </p>

            <h1
              className="font-display mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]"
              style={{ textWrap: 'balance' }}
            >
              Capture, tone, and export photographs in seconds.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Instant Photography turns your device camera into a zero-install
              studio. Shoot full-resolution frames, grade color and film curves
              on an HTML5 Canvas pipeline, and save crisp JPG or PNG files
              straight to your device.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onStartPhotography}
                className="inline-flex whitespace-nowrap shrink-0 items-center gap-2.5 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/50 transition-all duration-150 hover:bg-violet-500 active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" />
                <span>Start Photography</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate(photoCount > 0 ? 'gallery' : 'editor')}
                className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 py-3.5 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:border-zinc-500 hover:bg-zinc-900"
              >
                {photoCount > 0
                  ? `View Session Gallery (${photoCount})`
                  : 'Open Photo Editor'}
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
              <span>Zero account required</span>
              <span aria-hidden="true">·</span>
              <span>Local browser processing</span>
              <span aria-hidden="true">·</span>
              <span>JPG &amp; PNG export</span>
            </div>
          </div>

          {/* Right Column: Live Editorial Portrait & Interactive Tone Calibration */}
          <div className="lg:col-span-6">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-800 bg-[#0D0D13] p-5 sm:p-6">
              {/* Stage Header Metadata */}
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-3.5 text-xs text-zinc-400">
                <span className="font-medium text-zinc-200">
                  Studio Tone Calibration
                </span>
                <span className="font-mono tabular-nums">
                  {currentStudy.aperture} · {currentStudy.shutter} ·{' '}
                  {currentStudy.iso}
                </span>
              </div>

              {/* Real Studio Photograph with Viewfinder Reticle */}
              <div className="relative my-5 aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
                {!heroImgFailed ? (
                  <img
                    src={HERO_PORTRAIT_SRC}
                    alt="Studio portrait of a photographer holding a matte black rangefinder camera under violet rim lighting"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="h-full w-full object-cover transition-[filter] duration-300"
                    style={{ filter: currentStudy.filterCss }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-[#150f24] to-black p-6 text-center">
                    <Aperture className="h-10 w-10 text-violet-400" />
                    <p className="mt-3 text-sm font-medium text-zinc-200">
                      Studio Tone Preview
                    </p>
                  </div>
                )}

                {/* Subtle Rule-of-Thirds Reticle */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/10" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/10" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/10" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/10" />
                  <div className="absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 border-white/60" />
                  <div className="absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 border-white/60" />
                  <div className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-white/60" />
                  <div className="absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-white/60" />
                </div>

                {/* Measured Contrast Scrim Overlay */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">
                      {currentStudy.label}
                    </p>
                    <p className="truncate text-[11px] text-zinc-300">
                      50mm Studio Portrait · Live Filter Study
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadSampleIntoEditor(STUDIO_SAMPLES[0])}
                    className="whitespace-nowrap shrink-0 rounded-lg border border-white/25 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:border-violet-400 hover:bg-violet-600"
                  >
                    Edit This Photo
                  </button>
                </div>
              </div>

              {/* Interactive Preset Switcher */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LENS_STUDIES.map((study, idx) => {
                  const active = idx === studyIndex;
                  return (
                    <button
                      key={study.id}
                      type="button"
                      onClick={() => setStudyIndex(idx)}
                      className={`whitespace-nowrap truncate rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                        active
                          ? 'border-violet-500 bg-violet-600/20 text-white'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {study.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-Column Capability Strip below Hero Split */}
        <div className="mt-14 grid grid-cols-1 gap-4 border-t border-zinc-800/80 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITY_STRIP.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-800/90 bg-[#0C0C11] p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-display text-sm font-semibold text-white">
                    {item.title}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>

        {/* Editorial Sample Studies Strip */}
        <div className="mt-16 border-t border-zinc-800/80 pt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
                Instant Darkroom Sandbox
              </p>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Test the editor with studio sample frames
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Select any sample photograph below to open it directly in the
                HTML5 Canvas editor, or start your live camera.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartPhotography}
              className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 self-start rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-violet-500 sm:self-auto"
            >
              <Camera className="h-3.5 w-3.5 text-violet-400" />
              <span>Shoot With My Camera</span>
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STUDIO_SAMPLES.map((sample) => {
              const failed = Boolean(failedSamples[sample.id]);
              return (
                <article
                  key={sample.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0B0B10] transition-colors hover:border-zinc-700"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                    {!failed ? (
                      <img
                        src={sample.src}
                        alt={sample.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedSamples((prev) => ({
                            ...prev,
                            [sample.id]: true,
                          }))
                        }
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-4 text-center">
                        <Aperture className="h-6 w-6 text-violet-400" />
                        <span className="mt-2 text-xs text-zinc-300">
                          {sample.title}
                        </span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-white">
                        {sample.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {sample.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
                      <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                        {sample.exif}
                      </span>
                      <button
                        type="button"
                        onClick={() => onLoadSampleIntoEditor(sample)}
                        className="whitespace-nowrap shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-600 hover:text-white"
                      >
                        Load in Editor
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
