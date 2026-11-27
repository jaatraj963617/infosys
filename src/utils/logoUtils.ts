const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_DATA_URL_LEN = 38000;
const LOGO_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function isValidLogoDataUrl(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  if (val === '') return true;
  return val.length <= MAX_LOGO_DATA_URL_LEN && LOGO_DATA_URL_RE.test(val);
}

export async function processBusinessLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP, or SVG).');
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new Error('Logo image must be smaller than 5 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected logo image.'));
      el.src = objectUrl;
    });

    const maxDim = 160;
    const width = Math.max(1, img.naturalWidth || maxDim);
    const height = Math.max(1, img.naturalHeight || maxDim);
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas is unavailable to process the logo.');
    }
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const pngDataUrl = canvas.toDataURL('image/png');
    if (isValidLogoDataUrl(pngDataUrl)) {
      return pngDataUrl;
    }

    for (const quality of [0.85, 0.72, 0.55]) {
      const webpUrl = canvas.toDataURL('image/webp', quality);
      if (isValidLogoDataUrl(webpUrl)) {
        return webpUrl;
      }
      const jpegUrl = canvas.toDataURL('image/jpeg', quality);
      if (isValidLogoDataUrl(jpegUrl)) {
        return jpegUrl;
      }
    }

    throw new Error('Processed logo exceeds storage limit. Please try a simpler image.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
