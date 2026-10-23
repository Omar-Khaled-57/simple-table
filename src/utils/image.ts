const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 512;
const MAX_DATA_URL_LENGTH = 350_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageProcessingError('تعذّر قراءة الصورة. جرّب صورة أخرى.'));
    };
    image.src = url;
  });
}

export async function compressImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ImageProcessingError('نوع الصورة غير مدعوم. اختر صورة JPG أو PNG أو WebP أو GIF.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageProcessingError('حجم الصورة كبير جداً. الحد الأقصى 20 ميجابايت.');
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageProcessingError('تعذّر معالجة الصورة على هذا المتصفح.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.5) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new ImageProcessingError('تعذّر ضغط الصورة بدرجة كافية. جرّب صورة أصغر.');
  }
  return dataUrl;
}
