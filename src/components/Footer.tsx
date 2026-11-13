import React from 'react';
import { NavSection } from '../types/photo';

interface FooterProps {
  onNavigate: (section: NavSection) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-[#07070A]">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div>
          <span className="font-display text-sm font-bold text-white">
            Instant Photography
          </span>
          <p className="mt-1 text-xs text-zinc-500">
            Browser-native camera capture &amp; HTML5 Canvas darkroom.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-400"
        >
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'studio', label: 'Studio' },
              { id: 'editor', label: 'Editor' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'about', label: 'About' },
              { id: 'contact', label: 'Contact' },
            ] as { id: NavSection; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className="transition-colors hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
};
