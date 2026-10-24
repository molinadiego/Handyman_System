import { AppError } from '../errors/app-error.js';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

function readBoxes(buffer, start, end) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    const size32 = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    let size = size32;
    if (size32 === 1) {
      if (offset + 16 > end) throw new Error('Invalid extended media box.');
      const largeSize = buffer.readBigUInt64BE(offset + 8);
      if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Media box is too large.');
      size = Number(largeSize);
      headerSize = 16;
    } else if (size32 === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) throw new Error('Invalid media box size.');
    boxes.push({ type, start: offset, dataStart: offset + headerSize, end: offset + size });
    offset += size;
  }
  if (offset !== end) throw new Error('Truncated media box.');
  return boxes;
}

function findChild(buffer, parent, type) {
  return readBoxes(buffer, parent.dataStart, parent.end).find((box) => box.type === type) ?? null;
}

function readMediaDuration(buffer, header) {
  if (!header || header.dataStart + 20 > header.end) return null;
  const version = buffer[header.dataStart];
  if (version === 0) {
    if (header.dataStart + 20 > header.end) return null;
    const timeScale = buffer.readUInt32BE(header.dataStart + 12);
    const duration = buffer.readUInt32BE(header.dataStart + 16);
    if (!timeScale || duration === 0xffffffff) return null;
    return duration / timeScale;
  }
  if (version === 1) {
    if (header.dataStart + 32 > header.end) return null;
    const timeScale = buffer.readUInt32BE(header.dataStart + 20);
    const duration = buffer.readBigUInt64BE(header.dataStart + 24);
    if (!timeScale || duration === 0xffffffffffffffffn) return null;
    return Number(duration) / timeScale;
  }
  return null;
}

export function parseIsoBmffVideoDuration(buffer) {
  try {
    const topLevel = readBoxes(buffer, 0, buffer.length);
    const fileType = topLevel.find((box) => box.type === 'ftyp');
    const movie = topLevel.find((box) => box.type === 'moov');
    if (!fileType || !movie) throw new Error('MP4/MOV container boxes are missing.');
    const tracks = readBoxes(buffer, movie.dataStart, movie.end).filter((box) => box.type === 'trak');
    const videoDurations = [];
    for (const track of tracks) {
      const media = findChild(buffer, track, 'mdia');
      if (!media) continue;
      const handler = findChild(buffer, media, 'hdlr');
      if (!handler || handler.dataStart + 12 > handler.end) continue;
      const handlerType = buffer.toString('ascii', handler.dataStart + 8, handler.dataStart + 12);
      if (handlerType !== 'vide') continue;
      const duration = readMediaDuration(buffer, findChild(buffer, media, 'mdhd'));
      if (duration != null) videoDurations.push(duration);
    }
    if (!videoDurations.length) throw new Error('Video track duration is missing.');
    const duration = Math.max(...videoDurations);
    if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS) {
      throw new AppError('VIDEO_DURATION_LIMIT', 'Videos must be 60 seconds or shorter.', 400);
    }
    return Math.ceil(duration);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('INVALID_VIDEO_FILE', 'Video must be a valid MP4 or MOV file.', 400);
  }
}

function safeFilename(filename) {
  if (typeof filename !== 'string' || !filename.trim()) return 'upload';
  const base = filename.split(/[\\/]/u).pop().replace(/[\r\n\0]/gu, '').trim();
  const safe = base.replace(/[^\p{L}\p{N}._() -]/gu, '_').slice(0, 200);
  return safe || 'upload';
}

export function validateWorkOrderMediaUpload({ body, contentType, filename }) {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new AppError('EMPTY_MEDIA_FILE', 'Choose a file to upload.', 400);
  }
  const mimeType = typeof contentType === 'string' ? contentType.split(';')[0].trim().toLowerCase() : '';
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    if (body.length > MAX_PHOTO_BYTES) throw new AppError('PHOTO_SIZE_LIMIT', 'Photos must be 5 MB or smaller after on-device compression.', 413);
    const isJpeg = body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    const isPng = body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if ((mimeType === 'image/jpeg' && !isJpeg) || (mimeType === 'image/png' && !isPng)) {
      throw new AppError('INVALID_IMAGE_FILE', 'Photo content does not match JPEG or PNG.', 400);
    }
    return { type: 'PHOTO', contentType: mimeType, sizeBytes: body.length, durationSeconds: null, originalName: safeFilename(filename) };
  }
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    if (body.length > MAX_VIDEO_BYTES) throw new AppError('VIDEO_SIZE_LIMIT', 'Videos must be 50 MB or smaller.', 413);
    const durationSeconds = parseIsoBmffVideoDuration(body);
    return { type: 'VIDEO', contentType: mimeType, sizeBytes: body.length, durationSeconds, originalName: safeFilename(filename) };
  }
  throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Upload JPEG, PNG, MP4, or MOV files.', 415);
}
