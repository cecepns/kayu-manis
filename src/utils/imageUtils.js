import axios from 'axios';

export const API_BASE_URL = 'https://api-be.kayumanishomefurniture.com';

/** Build full image URL from relative path or pass through absolute URLs */
export function getImageUrl(pictureUrl) {
  if (!pictureUrl) return null;
  if (pictureUrl.startsWith('http://') || pictureUrl.startsWith('https://')) {
    return pictureUrl;
  }
  const path = pictureUrl.startsWith('/') ? pictureUrl : `/${pictureUrl}`;
  return `${API_BASE_URL}${path}`;
}

/** Relative path for API proxy (e.g. /uploads-furniture/file.png) */
export function getImagePath(pictureUrl) {
  if (!pictureUrl) return null;
  if (pictureUrl.startsWith('http://') || pictureUrl.startsWith('https://')) {
    try {
      const url = new URL(pictureUrl);
      return url.pathname;
    } catch {
      return null;
    }
  }
  return pictureUrl.startsWith('/') ? pictureUrl : `/${pictureUrl}`;
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

const MIME_BY_EXTENSION = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
};

/** Read intrinsic pixel size from base64 (browser). */
export function getDimensionsFromBase64(base64, extension = 'jpeg') {
  if (!base64) return Promise.resolve(null);
  const mime = MIME_BY_EXTENSION[extension] || 'image/jpeg';
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => resolve(null);
    img.src = `data:${mime};base64,${base64}`;
  });
}

/** Scale image to fit inside a box while preserving aspect ratio. */
export function fitImageToBox(naturalWidth, naturalHeight, maxWidth, maxHeight) {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    const side = Math.min(maxWidth, maxHeight);
    return { width: side, height: side };
  }

  const ratio = naturalWidth / naturalHeight;
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Fetch image as base64 for Excel export via backend proxy (avoids CORS/canvas issues).
 */
export async function fetchImageForExcel(pictureUrl) {
  const imagePath = getImagePath(pictureUrl);
  if (!imagePath) return null;

  try {
    const response = await api.get('/images/base64', {
      params: { path: imagePath },
    });
    let { base64, width, height, extension } = response.data;
    if (!base64) return null;

    extension = extension || 'jpeg';

    if (!width || !height) {
      const dims = await getDimensionsFromBase64(base64, extension);
      if (dims) {
        width = dims.width;
        height = dims.height;
      }
    }

    return { base64, width, height, extension };
  } catch (error) {
    console.error('Error fetching image for Excel:', error, imagePath);
    return null;
  }
}

export async function downloadImage(pictureUrl, filename = 'product-image') {
  const url = getImageUrl(pictureUrl);
  if (!url) return;

  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
    if (!response.ok) throw new Error('Failed to fetch image');
    const blob = await response.blob();
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (error) {
    console.error('Error downloading image:', error);
    alert('Failed to download image');
  }
}
