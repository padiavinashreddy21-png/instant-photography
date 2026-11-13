import {
  CapturedPhoto,
  FilterPresetId,
  PhotoEditState,
} from '../types/photo';

export interface FilterPresetInfo {
  id: FilterPresetId;
  label: string;
  toneNote: string;
  swatchClass: string;
}

export const FILTER_PRESETS: FilterPresetInfo[] = [
  {
    id: 'original',
    label: 'Original',
    toneNote: 'Unaltered sensor output',
    swatchClass: 'from-zinc-200 via-zinc-500 to-zinc-900',
  },
  {
    id: 'bw',
    label: 'Black & White',
    toneNote: 'Silver luminance contrast',
    swatchClass: 'from-white via-zinc-500 to-black',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    toneNote: 'Lifted matte film shadows',
    swatchClass: 'from-amber-200 via-stone-500 to-zinc-900',
  },
  {
    id: 'vintage-warm',
    label: 'Vintage Warm',
    toneNote: 'Golden highlights & warm grain',
    swatchClass: 'from-amber-300 via-orange-400 to-stone-800',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    toneNote: 'Archival warm chemical bath',
    swatchClass: 'from-amber-100 via-amber-700 to-stone-950',
  },
  {
    id: 'purple-noir',
    label: 'Purple Noir',
    toneNote: 'Monochrome with violet shadows',
    swatchClass: 'from-zinc-100 via-violet-500 to-zinc-950',
  },
  {
    id: 'vivid',
    label: 'Crisp Vivid',
    toneNote: 'Punchy color & deep blacks',
    swatchClass: 'from-violet-400 via-fuchsia-500 to-zinc-900',
  },
  {
    id: 'cool-film',
    label: 'Cool Film',
    toneNote: 'Crisp slate shadow balance',
    swatchClass: 'from-sky-200 via-slate-500 to-zinc-950',
  },
];

export const DEFAULT_EDIT_STATE: PhotoEditState = {
  filter: 'original',
  adjustments: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    vignette: 0,
  },
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: null,
};

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image data.'));
    img.src = src;
  });
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Renders the source image with rotation, flip, crop, adjustments, filter, and vignette
 * onto a new HTMLCanvasElement. Uses cross-browser pixel processing so results match
 * identically on Chrome, Firefox, Edge, and Safari.
 */
export function renderEditedCanvas(
  img: HTMLImageElement,
  editState: PhotoEditState,
  maxDimension?: number
): HTMLCanvasElement {
  const isRotatedOdd = editState.rotation === 90 || editState.rotation === 270;
  const fullRotW = isRotatedOdd ? img.naturalHeight : img.naturalWidth;
  const fullRotH = isRotatedOdd ? img.naturalWidth : img.naturalHeight;

  const crop = editState.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  const cropX = Math.max(0, Math.round(crop.x * fullRotW));
  const cropY = Math.max(0, Math.round(crop.y * fullRotH));
  const cropW = Math.max(1, Math.round(crop.width * fullRotW));
  const cropH = Math.max(1, Math.round(crop.height * fullRotH));

  let targetW = cropW;
  let targetH = cropH;
  if (maxDimension && (targetW > maxDimension || targetH > maxDimension)) {
    const scale = maxDimension / Math.max(targetW, targetH);
    targetW = Math.max(1, Math.round(targetW * scale));
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  // Step 1: Draw rotated/flipped full image into an intermediate scaled space
  const scaleX = targetW / cropW;
  const scaleY = targetH / cropH;
  const scaledRotW = Math.max(1, Math.round(fullRotW * scaleX));
  const scaledRotH = Math.max(1, Math.round(fullRotH * scaleY));

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = scaledRotW;
  rotCanvas.height = scaledRotH;
  const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
  if (!rotCtx) {
    return rotCanvas;
  }

  rotCtx.save();
  rotCtx.translate(scaledRotW / 2, scaledRotH / 2);
  rotCtx.rotate((editState.rotation * Math.PI) / 180);
  rotCtx.scale(editState.flipH ? -1 : 1, editState.flipV ? -1 : 1);
  const drawW = isRotatedOdd ? scaledRotH : scaledRotW;
  const drawH = isRotatedOdd ? scaledRotW : scaledRotH;
  rotCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  rotCtx.restore();

  // Step 2: Extract cropped region into output canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) {
    return outCanvas;
  }

  const sx = Math.min(scaledRotW - 1, Math.round(cropX * scaleX));
  const sy = Math.min(scaledRotH - 1, Math.round(cropY * scaleY));
  const sw = Math.min(scaledRotW - sx, targetW);
  const sh = Math.min(scaledRotH - sy, targetH);
  outCtx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH);

  // Step 3: Pixel-level adjustments & filter pipeline
  const { brightness, contrast, saturation, vignette } = editState.adjustments;
  const hasPixelEdits =
    editState.filter !== 'original' ||
    brightness !== 0 ||
    contrast !== 0 ||
    saturation !== 0;

  if (hasPixelEdits) {
    const imgData = outCtx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    const brightOffset = (brightness / 100) * 110;
    const contrastFactor =
      contrast >= 0
        ? 1 + (contrast / 100) * 1.4
        : 1 + (contrast / 100) * 0.75;
    const satFactor = 1 + saturation / 100;
    const filter = editState.filter;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      if (brightOffset !== 0) {
        r += brightOffset;
        g += brightOffset;
        b += brightOffset;
      }

      // Contrast
      if (contrastFactor !== 1) {
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;
      }

      // Saturation
      if (satFactor !== 1) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lum + (r - lum) * satFactor;
        g = lum + (g - lum) * satFactor;
        b = lum + (b - lum) * satFactor;
      }

      // Filter color transforms
      if (filter === 'bw') {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const crisp = (lum - 128) * 1.12 + 128;
        r = crisp;
        g = crisp;
        b = crisp;
      } else if (filter === 'sepia') {
        const sr = r * 0.393 + g * 0.769 + b * 0.189;
        const sg = r * 0.349 + g * 0.686 + b * 0.168;
        const sb = r * 0.272 + g * 0.534 + b * 0.131;
        r = sr;
        g = sg;
        b = sb;
      } else if (filter === 'vintage') {
        // Lifted faded shadows + gentle desaturated warm midtones
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = lum + (r - lum) * 0.78;
        g = lum + (g - lum) * 0.78;
        b = lum + (b - lum) * 0.72;
        r = r * 0.92 + 24;
        g = g * 0.9 + 18;
        b = b * 0.84 + 16;
      } else if (filter === 'vintage-warm') {
        // Golden amber warmth + lifted matte shadows
        r = r * 1.06 + 18;
        g = g * 0.99 + 10;
        b = b * 0.82 + 4;
      } else if (filter === 'purple-noir') {
        // High-contrast monochrome with subtle deep violet shadow tint
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const crisp = (lum - 128) * 1.18 + 126;
        const shadowWeight = Math.max(0, 1 - crisp / 170);
        r = crisp + shadowWeight * 16;
        g = crisp - shadowWeight * 10;
        b = crisp + shadowWeight * 34;
      } else if (filter === 'vivid') {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lum + (r - lum) * 1.32;
        g = lum + (g - lum) * 1.32;
        b = lum + (b - lum) * 1.32;
        r = (r - 128) * 1.1 + 128;
        g = (g - 128) * 1.1 + 128;
        b = (b - 128) * 1.1 + 128;
      } else if (filter === 'cool-film') {
        r = r * 0.92 + 4;
        g = g * 0.98 + 6;
        b = b * 1.08 + 14;
      }

      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
    }

    outCtx.putImageData(imgData, 0, 0);
  }

  // Step 4: Vignette (user slider + subtle automatic edge vignette for Vintage)
  const effectiveVignette = Math.min(
    100,
    vignette + (editState.filter === 'vintage' ? 22 : 0)
  );
  if (effectiveVignette > 0) {
    const cx = targetW / 2;
    const cy = targetH / 2;
    const outerRadius = Math.hypot(cx, cy);
    const innerRadius = outerRadius * (0.48 - (effectiveVignette / 100) * 0.18);
    const grad = outCtx.createRadialGradient(
      cx,
      cy,
      Math.max(1, innerRadius),
      cx,
      cy,
      outerRadius
    );
    const edgeAlpha = (effectiveVignette / 100) * 0.78;
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.65, `rgba(0,0,0,${(edgeAlpha * 0.35).toFixed(3)})`);
    grad.addColorStop(1, `rgba(0,0,0,${edgeAlpha.toFixed(3)})`);
    outCtx.fillStyle = grad;
    outCtx.fillRect(0, 0, targetW, targetH);
  }

  return outCanvas;
}

export async function renderEditedDataUrl(
  originalDataUrl: string,
  editState: PhotoEditState,
  maxDimension?: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImageElement(originalDataUrl);
  const canvas = renderEditedCanvas(img, editState, maxDimension);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: canvas.height,
  };
}

export function buildMeaningfulFilename(
  photo: CapturedPhoto,
  format: 'jpeg' | 'png',
  customBaseName?: string
): string {
  const ext = format === 'png' ? 'png' : 'jpg';
  const cleanedCustom = customBaseName
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleanedCustom) {
    return `${cleanedCustom}.${ext}`;
  }

  const dt = new Date(photo.capturedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStamp = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  const timeStamp = `${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`;
  const filterSlug =
    photo.editState.filter === 'original' ? 'raw' : photo.editState.filter;

  return `instant-photography-${dateStamp}-${timeStamp}-${filterSlug}.${ext}`;
}

export async function exportEditedPhoto(
  photo: CapturedPhoto,
  format: 'jpeg' | 'png',
  customBaseName?: string
): Promise<{ blob: Blob; filename: string; width: number; height: number }> {
  const img = await loadImageElement(photo.originalDataUrl);
  const canvas = renderEditedCanvas(img, photo.editState);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'jpeg' ? 0.95 : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Unable to encode image file.'));
      },
      mime,
      quality
    );
  });

  return {
    blob,
    filename: buildMeaningfulFilename(photo, format, customBaseName),
    width: canvas.width,
    height: canvas.height,
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
