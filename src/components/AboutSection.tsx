import React from 'react';
import { ArrowRight, ShieldCheck, Cpu, Layers } from 'lucide-react';

interface AboutSectionProps {
  onStartPhotography: () => void;
}

const ARCHITECTURE_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Zero-Database Session Privacy',
    body: 'Every camera frame, filter calculation, and exported file runs locally in your browser memory. Nothing is uploaded to external servers.',
  },
  {
    icon: Cpu,
    title: 'Native Hardware & Canvas Engine',
    body: 'Powered directly by the browser MediaDevices API (getUserMedia) for live camera streams and HTML5 Canvas pixel buffers for accurate color grading.',
  },
  {
    icon: Layers,
    title: 'Unified Capture-to-Export Workflow',
    body: 'Replaces separate camera, filter, cropping, and conversion apps with one responsive studio built for mobile, tablet, and desktop viewports.',
  },
];

export const AboutSection: React.FC<AboutSectionProps> = ({
  onStartPhotography,
}) => {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-zinc-800 pb-6">
        <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
          Purpose &amp; Architecture
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          About Instant Photography
        </h1>
      </div>

      {/* Editorial Narrative Split */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              01. The Problem We Solve
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-zinc-300">
              Capturing, refining, and downloading a quick photograph often
              forces people to bounce between a native camera app, a separate
              filter editor, and a file converter. Instant Photography unifies
              the entire workflow inside a single fast web studio—ready the
              moment you open the page.
            </p>
          </div>

          <div className="border-t border-zinc-800/80 pt-6">
            <h2 className="font-display text-xl font-semibold text-white">
              02. Core Objectives
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-zinc-300">
              <li>
                01. Request explicit browser camera permission and deliver a
                responsive live viewfinder with front/rear lens switching and
                flash support.
              </li>
              <li>
                02. Provide one-click shutter capture with instant review,
                retake, and delete controls.
              </li>
              <li>
                03. Offer real pixel-level color filters, exposure sliders,
                90-degree rotation, mirroring, and interactive cropping via the
                HTML5 Canvas API.
              </li>
              <li>
                04. Export high-resolution JPG and lossless PNG files with
                meaningful automatic filenames.
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onStartPhotography}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              <span>Launch Camera Studio</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Project Specification Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6">
            <h2 className="font-display text-base font-semibold text-white">
              Technical Specification
            </h2>
            <dl className="mt-5 divide-y divide-zinc-800/80 text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-400">Application</dt>
                <dd className="font-medium text-white">Instant Photography</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-400">Camera Pipeline</dt>
                <dd className="font-mono text-xs text-zinc-200">
                  MediaDevices.getUserMedia
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-400">Image Engine</dt>
                <dd className="font-mono text-xs text-zinc-200">
                  HTML5 Canvas 2D Context
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-400">Export Formats</dt>
                <dd className="text-zinc-200">JPG (95%) / PNG (Lossless)</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-400">Storage Model</dt>
                <dd className="text-zinc-200">Session Memory (No Database)</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-400">Developer</dt>
                <dd className="text-right text-zinc-200">
                  Padi Avinash Reddy · B.Tech
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* 3-Column Pillars */}
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {ARCHITECTURE_PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-4 text-base font-semibold text-white">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {pillar.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
