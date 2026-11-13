import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavSection } from '../types/photo';

interface NavbarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  photoCount: number;
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'editor', label: 'Editor' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  photoCount,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (section: NavSection) => {
    onNavigate(section);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#07070A]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-display whitespace-nowrap shrink-0 text-left text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-85"
        >
          Instant Photography
        </button>

        {/* Zone 2: 5 clean single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const suffix =
              item.id === 'gallery' && photoCount > 0
                ? ` (${photoCount})`
                : '';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative whitespace-nowrap shrink-0 py-1 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
                {suffix && (
                  <span className="tabular-nums text-violet-400">{suffix}</span>
                )}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 bg-violet-500 transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('studio')}
            className="hidden sm:inline-flex whitespace-nowrap shrink-0 items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-500 active:bg-violet-700"
          >
            Start Photography
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-200 transition-colors hover:border-zinc-700 hover:text-white md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="border-t border-zinc-800 bg-[#0B0B10] px-4 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleSelect('home')}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeSection === 'home'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
              }`}
            >
              <span>Home</span>
            </button>
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'gallery' && photoCount > 0 && (
                    <span className="tabular-nums text-xs text-violet-400">
                      {photoCount}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleSelect('studio')}
              className="mt-2 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              Start Photography
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
