/**
 * Receipt photo compression. Receipts live in the Realtime Database as data URLs,
 * so they must stay well under the size cap in firebase-rules.json (600k chars).
 */

const MAX_DATA_URL_LENGTH = 550_000;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image.')); };
    img.src = url;
  });

/**
 * Resizes and re-encodes a photo as JPEG, stepping size and quality down until it fits.
 * An <img> is used rather than createImageBitmap so the camera's EXIF rotation is applied.
 * @returns JPEG data URL
 */
export const compressImage = async (file: File): Promise<string> => {
  const img = await loadImage(file);
  let maxSide = 1280;
  let quality = 0.6;

  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const context = canvas.getContext('2d')!;
    // JPEG has no transparency; without this, transparent PNGs/screenshots turn black
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    maxSide = Math.round(maxSide * 0.75);
    quality -= 0.1;
  }
  throw new Error('This photo is too large to store, even after compression.');
};
