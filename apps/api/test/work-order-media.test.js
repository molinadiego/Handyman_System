import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIsoBmffVideoDuration, validateWorkOrderMediaUpload } from '../src/models/work-order-media.model.js';

function box(type, body) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + body.length, 0);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, body]);
}

function mockVideo(durationSeconds) {
  const ftyp = box('ftyp', Buffer.from('isom0000isommp42'));
  const handler = Buffer.alloc(12);
  handler.write('vide', 8, 4, 'ascii');
  const mdhd = Buffer.alloc(20);
  mdhd.writeUInt32BE(1000, 12);
  mdhd.writeUInt32BE(durationSeconds * 1000, 16);
  const mdia = box('mdia', Buffer.concat([box('hdlr', handler), box('mdhd', mdhd)]));
  return Buffer.concat([ftyp, box('moov', box('trak', mdia))]);
}

test('video validation parses MP4/MOV duration and enforces the 60 second maximum', () => {
  const underLimit = mockVideo(60);
  assert.equal(parseIsoBmffVideoDuration(underLimit), 60);
  assert.equal(validateWorkOrderMediaUpload({
    body: underLimit,
    contentType: 'video/mp4',
    filename: 'job.mp4',
  }).durationSeconds, 60);
  assert.throws(() => parseIsoBmffVideoDuration(mockVideo(61)), { code: 'VIDEO_DURATION_LIMIT' });
});

test('photo bytes are checked against their MIME type and five megabyte limit', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  assert.equal(validateWorkOrderMediaUpload({ body: jpeg, contentType: 'image/jpeg', filename: 'photo.jpg' }).type, 'PHOTO');
  assert.throws(() => validateWorkOrderMediaUpload({
    body: Buffer.alloc(5 * 1024 * 1024 + 1),
    contentType: 'image/jpeg',
    filename: 'large.jpg',
  }), { code: 'PHOTO_SIZE_LIMIT' });
});
