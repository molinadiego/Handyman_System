const PHOTO_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;
const VIDEO_DURATION_LIMIT = 60;

function isHeic(file) {
  const name = file.name.toLowerCase();
  return ['image/heic', 'image/heif'].includes(file.type.toLowerCase()) || /\.(heic|heif)$/u.test(name);
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not compress image.')), type, quality);
  });
}

async function normalizeHeic(file) {
  const module = await import('heic2any');
  const convert = module.default ?? module;
  const converted = await convert({ blob: file, toType: 'image/jpeg', quality: 0.86 });
  return Array.isArray(converted) ? converted[0] : converted;
}

export async function compressWorkOrderPhoto(file) {
  if (!file) throw new Error('Choose a photo.');
  const originalName = file.name || 'work-order-photo';
  const heic = isHeic(file);
  if (!heic && !['image/jpeg', 'image/png'].includes(file.type.toLowerCase())) {
    throw new Error('Choose a JPEG, PNG, or HEIC photo.');
  }

  const source = heic ? await normalizeHeic(file) : file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(source);
    const canvas = document.createElement('canvas');
    let scale = 1;
    let quality = 0.86;
    const outputType = source.type === 'image/png' && !heic ? 'image/png' : 'image/jpeg';
    for (let attempt = 0; attempt < 24; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d', { alpha: outputType === 'image/png' });
      if (!context) throw new Error('Image compression is unavailable in this browser.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas, outputType, outputType === 'image/jpeg' ? quality : undefined);
      if (blob.size <= PHOTO_LIMIT) {
        const suffix = outputType === 'image/png' ? '.png' : '.jpg';
        const baseName = originalName.replace(/\.(jpe?g|png|heic|heif)$/iu, '');
        return { blob, contentType: outputType, filename: `${baseName}${suffix}` };
      }
      if (outputType === 'image/jpeg' && quality > 0.54) quality -= 0.08;
      else {
        scale *= 0.82;
        quality = 0.78;
      }
    }
  } finally {
    bitmap?.close();
  }
  throw new Error('This photo could not be compressed below 5 MB. Choose a smaller image.');
}

function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const finish = (callback, value) => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      callback(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => finish(resolve, video.duration);
    video.onerror = () => finish(reject, new Error('Could not read video duration.'));
    video.src = url;
  });
}

export async function validateWorkOrderVideo(file) {
  if (!file) throw new Error('Choose a video.');
  const name = file.name || 'work-order-video';
  const type = file.type.toLowerCase() || (/\.mov$/iu.test(name) ? 'video/quicktime' : 'video/mp4');
  if (!['video/mp4', 'video/quicktime'].includes(type)) throw new Error('Choose an MP4 or MOV video.');
  if (file.size > VIDEO_LIMIT) throw new Error('Videos must be 50 MB or smaller.');
  const duration = await readVideoDuration(file);
  if (!Number.isFinite(duration) || duration <= 0 || duration > VIDEO_DURATION_LIMIT) {
    throw new Error('Videos must be 60 seconds or shorter.');
  }
  return { blob: file, contentType: type, filename: name, durationSeconds: Math.ceil(duration) };
}
