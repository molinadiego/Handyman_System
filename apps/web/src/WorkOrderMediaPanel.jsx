import { useEffect, useState } from 'react';
import { compressWorkOrderPhoto, validateWorkOrderVideo } from './work-order-media.client.js';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function mediaError(body, text) {
  switch (body?.error?.code) {
    case 'WORK_ORDER_PHOTO_UPLOAD_FORBIDDEN': return text.photoUploadForbidden;
    case 'WORK_ORDER_VIDEO_UPLOAD_FORBIDDEN': return text.videoUploadForbidden;
    case 'PHOTO_SIZE_LIMIT': return text.photoSizeLimit;
    case 'VIDEO_SIZE_LIMIT': return text.videoSizeLimit;
    case 'VIDEO_DURATION_LIMIT': return text.videoDurationLimit;
    case 'UNSUPPORTED_MEDIA_TYPE': return text.unsupportedMedia;
    case 'MEDIA_STORAGE_NOT_CONFIGURED': return text.mediaStorageUnavailable;
    case 'WORK_ORDER_ACCESS_INVALID': return text.employeeAccessInvalid;
    default: return text.genericError;
  }
}

export function WorkOrderMediaPanel({ workspaceId, workOrder, employeeCode = null, permissions = null, text }) {
  const ownerMode = !employeeCode;
  const base = ownerMode
    ? `/api/workspaces/${encodeURIComponent(workspaceId)}/work-orders/${encodeURIComponent(workOrder.id)}/media`
    : '/api/assigned-work-order/media';
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const canPhotos = ownerMode || permissions?.canUploadPhotos;
  const canVideos = ownerMode || permissions?.canUploadVideos;

  async function refresh() {
    const response = await fetch(base, {
      ...(employeeCode ? { headers: { 'X-Work-Order-Access-Code': employeeCode } } : {}),
      cache: 'no-store',
    });
    const body = await readResponse(response);
    if (!response.ok) throw new Error(mediaError(body, text));
    setAttachments(body.data ?? []);
  }

  useEffect(() => {
    if (canPhotos || canVideos) refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workOrder.id, employeeCode, canPhotos, canVideos]);

  async function upload(files, type) {
    setBusy(true);
    setNotice(null);
    try {
      for (const file of files) {
        const prepared = type === 'PHOTO'
          ? await compressWorkOrderPhoto(file)
          : await validateWorkOrderVideo(file);
        const response = await fetch(base, {
          method: 'POST',
          headers: {
            'Content-Type': prepared.contentType,
            'X-Original-File-Name': encodeURIComponent(prepared.filename),
            ...(employeeCode ? { 'X-Work-Order-Access-Code': employeeCode } : {}),
          },
          body: prepared.blob,
        });
        const body = await readResponse(response);
        if (!response.ok) throw new Error(mediaError(body, text));
      }
      await refresh();
      setNotice({ type: 'success', message: text.mediaUploaded });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function download(attachment) {
    const response = await fetch(`${base}/${encodeURIComponent(attachment.id)}`, {
      ...(employeeCode ? { headers: { 'X-Work-Order-Access-Code': employeeCode } } : {}),
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await readResponse(response);
      setNotice({ type: 'error', message: mediaError(body, text) });
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = attachment.originalName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!canPhotos && !canVideos) return null;

  return (
    <section className="actuals-panel work-order-media-panel">
      <h3>{text.orderFiles}</h3>
      <p className="form-footnote">{text.mediaPrivacyNotice}</p>
      {notice && <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>}
      <div className="media-upload-actions">
        {canPhotos && <label className="secondary-button media-file-button">{text.addPhotos}
          <input className="media-file-input" type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" multiple disabled={busy} onChange={(event) => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; if (selected.length) upload(selected, 'PHOTO'); }} />
        </label>}
        {canVideos && <label className="secondary-button media-file-button">{text.addVideos}
          <input className="media-file-input" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" multiple disabled={busy} onChange={(event) => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; if (selected.length) upload(selected, 'VIDEO'); }} />
        </label>}
        {busy && <span className="form-footnote">{text.uploadingMedia}</span>}
      </div>
      <div className="media-list">
        {attachments.map((attachment) => (
          <div className="workspace-row" key={attachment.id}>
            <span>{attachment.type === 'PHOTO' ? text.photo : text.video}: {attachment.originalName} · {(attachment.sizeBytes / (1024 * 1024)).toFixed(2)} MB{attachment.durationSeconds ? ` · ${attachment.durationSeconds}s` : ''}</span>
            <button className="secondary-button" type="button" onClick={() => download(attachment)}>{text.downloadFile}</button>
          </div>
        ))}
        {!attachments.length && <p className="form-footnote">{text.noFilesYet}</p>}
      </div>
    </section>
  );
}
