import { useCallback, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CameraStudio } from './components/CameraStudio';
import { PhotoEditor } from './components/PhotoEditor';
import { SessionGallery } from './components/SessionGallery';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { CapturedPhoto, NavSection, PhotoEditState } from './types/photo';
import { createPhotoFromSample, StudioSample } from './utils/samplePhotos';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const navigateTo = useCallback((section: NavSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePhotoAdded = useCallback((photo: CapturedPhoto) => {
    setPhotos((prev) => [photo, ...prev]);
    setSelectedPhotoId(photo.id);
  }, []);

  const handleLoadSampleIntoEditor = useCallback(async (sample: StudioSample) => {
    const photo = await createPhotoFromSample(sample, false);
    setPhotos((prev) => [photo, ...prev]);
    setSelectedPhotoId(photo.id);
    setActiveSection('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenEditor = useCallback((photoId: string) => {
    setSelectedPhotoId(photoId);
    setActiveSection('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUpdatePhoto = useCallback(
    (photoId: string, editState: PhotoEditState, editedDataUrl: string) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, editState, editedDataUrl } : p
        )
      );
    },
    []
  );

  const handleDeletePhoto = useCallback(
    (photoId: string) => {
      setPhotos((prev) => {
        const remaining = prev.filter((p) => p.id !== photoId);
        if (selectedPhotoId === photoId) {
          setSelectedPhotoId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
    },
    [selectedPhotoId]
  );

  const handleClearAllPhotos = useCallback(() => {
    setPhotos([]);
    setSelectedPhotoId(null);
  }, []);

  const selectedPhoto =
    photos.find((p) => p.id === selectedPhotoId) ?? photos[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[#07070A] text-[#F5F5F7]">
      <Navbar
        activeSection={activeSection}
        onNavigate={navigateTo}
        photoCount={photos.length}
      />

      <main className="flex-1">
        {activeSection === 'home' && (
          <>
            <HeroSection
              onStartPhotography={() => navigateTo('studio')}
              onNavigate={navigateTo}
              onLoadSampleIntoEditor={handleLoadSampleIntoEditor}
              photoCount={photos.length}
            />

            {/* Clean 3-Step Workflow Section on Home */}
            <section className="mx-auto max-w-7xl border-t border-zinc-800/80 px-4 py-14 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
                    Three-Step Workflow
                  </p>
                  <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    From live lens to finished export
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('about')}
                  className="self-start text-sm font-medium text-zinc-300 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-white hover:decoration-violet-500 sm:self-auto"
                >
                  Read technical architecture
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6">
                  <span className="font-mono text-xs text-violet-400">01. Capture</span>
                  <h3 className="font-display mt-2 text-lg font-semibold text-white">
                    Live Camera Studio
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Grant camera access once to preview your front or rear lens,
                    toggle flash or composition grid, and capture crisp frames.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6">
                  <span className="font-mono text-xs text-violet-400">02. Refine</span>
                  <h3 className="font-display mt-2 text-lg font-semibold text-white">
                    Color &amp; Geometry Editor
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Apply Black &amp; White, Vintage Warm, Sepia, or Purple Noir
                    presets, tune brightness and contrast, rotate, and crop.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6">
                  <span className="font-mono text-xs text-violet-400">03. Export</span>
                  <h3 className="font-display mt-2 text-lg font-semibold text-white">
                    Session Roll &amp; Download
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Review every photograph taken during your session in the
                    lightbox gallery and save full-resolution JPG or PNG files.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeSection === 'studio' && (
          <CameraStudio
            onPhotoCaptured={handlePhotoAdded}
            onOpenEditor={handleOpenEditor}
            onDeletePhoto={handleDeletePhoto}
            latestCapturedPhoto={photos[0] ?? null}
          />
        )}

        {activeSection === 'editor' && (
          <PhotoEditor
            photos={photos}
            selectedPhoto={selectedPhoto}
            onSelectPhoto={setSelectedPhotoId}
            onUpdatePhoto={handleUpdatePhoto}
            onDeletePhoto={handleDeletePhoto}
            onRetake={() => navigateTo('studio')}
            onPhotoImported={handlePhotoAdded}
          />
        )}

        {activeSection === 'gallery' && (
          <SessionGallery
            photos={photos}
            onEditPhoto={handleOpenEditor}
            onDeletePhoto={handleDeletePhoto}
            onClearAll={handleClearAllPhotos}
            onOpenStudio={() => navigateTo('studio')}
          />
        )}

        {activeSection === 'about' && (
          <AboutSection onStartPhotography={() => navigateTo('studio')} />
        )}

        {activeSection === 'contact' && <ContactSection />}
      </main>

      <Footer onNavigate={navigateTo} />
    </div>
  );
}
