import heroStudioPortrait from '../assets/images/hero_studio_portrait_1794557701139.jpg';
import sampleArchitectureLight from '../assets/images/sample_architecture_light_1794557701571.jpg';
import sampleTwilightStreet from '../assets/images/sample_twilight_street_1794557703219.jpg';
import sampleBotanicalMacro from '../assets/images/sample_botanical_macro_1794557702759.jpg';
import { CapturedPhoto, FilterPresetId } from '../types/photo';
import { DEFAULT_EDIT_STATE, loadImageElement } from './canvasProcessor';

export interface StudioSample {
  id: string;
  title: string;
  subtitle: string;
  exif: string;
  recommendedFilter: FilterPresetId;
  src: string;
}

export const HERO_PORTRAIT_SRC = heroStudioPortrait;

export const STUDIO_SAMPLES: StudioSample[] = [
  {
    id: 'sample-portrait',
    title: 'Studio Rangefinder Portrait',
    subtitle: 'Violet rim light & crisp monochrome skin tones',
    exif: '50mm · f/1.4 · 1/250s',
    recommendedFilter: 'purple-noir',
    src: heroStudioPortrait,
  },
  {
    id: 'sample-architecture',
    title: 'Brutalist Daylight',
    subtitle: 'High-contrast concrete geometry & diagonal sun',
    exif: '35mm · f/5.6 · 1/500s',
    recommendedFilter: 'bw',
    src: sampleArchitectureLight,
  },
  {
    id: 'sample-twilight',
    title: 'Twilight Rain',
    subtitle: 'Wet asphalt reflections in violet & amber',
    exif: '35mm · f/1.8 · 1/125s',
    recommendedFilter: 'vintage-warm',
    src: sampleTwilightStreet,
  },
  {
    id: 'sample-botanical',
    title: 'Botanical Dew Macro',
    subtitle: 'Directional studio key light on dark foliage',
    exif: '90mm · f/2.8 · 1/200s',
    recommendedFilter: 'vivid',
    src: sampleBotanicalMacro,
  },
];

export async function createPhotoFromSample(
  sample: StudioSample,
  applyRecommendedFilter = false
): Promise<CapturedPhoto> {
  const img = await loadImageElement(sample.src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0);
  }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

  return {
    id: `smp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    originalDataUrl: dataUrl,
    editedDataUrl: dataUrl,
    width: img.naturalWidth,
    height: img.naturalHeight,
    capturedAt: new Date().toISOString(),
    source: 'upload',
    cameraLabel: sample.title,
    editState: {
      ...DEFAULT_EDIT_STATE,
      filter: applyRecommendedFilter ? sample.recommendedFilter : 'original',
      adjustments: { ...DEFAULT_EDIT_STATE.adjustments },
    },
  };
}
