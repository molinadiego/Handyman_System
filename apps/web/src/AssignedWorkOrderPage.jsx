import { useState } from 'react';
import {
  deletePreparedOfflineOrder,
  findPreparedOfflineOrder,
  savePreparedOfflineOrder,
  updatePreparedOfflineOrder,
} from './offline-work-order.store.js';
import { WorkOrderMediaPanel } from './WorkOrderMediaPanel.jsx';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function removePreparedLockboxValues(data) {
  return {
    ...data,
    workOrder: {
      ...data.workOrder,
      property: {
        ...data.workOrder.property,
        accessData: data.workOrder.property.accessData.map(({ value, ...credential }) => credential),
      },
    },
  };
}

function offlineCodeCopy(payload) {
  return removePreparedLockboxValues(payload);
}

function errorMessage(body, text) {
  switch (body?.error?.code) {
    case 'WORK_ORDER_ACCESS_INVALID': return text.employeeAccessInvalid;
    case 'WORK_ORDER_PROGRESS_FORBIDDEN': return text.progressForbidden;
    case 'WORK_ORDER_NOTES_FORBIDDEN': return text.notesForbidden;
    case 'WORK_ORDER_PROGRESS_TRANSITION_INVALID': return text.progressTransitionInvalid;
    case 'WORK_ORDER_NOT_PREPARED_OFFLINE': return text.offlineMustPrepare;
    case 'OFFLINE_SYNC_FAILED': return text.offlineSyncFailed;
    default: return text.genericError;
  }
}

function dateLabel(instant, timeZone, isSpanish) {
  if (!instant) return null;
  return new Intl.DateTimeFormat(isSpanish ? 'es-US' : 'en-US', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(instant));
}

export function AssignedWorkOrderPage({ text }) {
  const [codeInput, setCodeInput] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [access, setAccess] = useState(null);
  const [note, setNote] = useState('');
  const [revealed, setRevealed] = useState({});
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlinePrepared, setOfflinePrepared] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function loadFromOfflineCache(code) {
    const cached = await findPreparedOfflineOrder(code);
    if (!cached) return false;
    setActiveCode(code);
    setAccess(cached.payload);
    setOfflineMode(true);
    setOfflinePrepared(true);
    setRevealed({});
    setNotice({ type: 'warning', message: text.offlineRevocationNotice });
    return true;
  }

  async function syncQueuedOffline(code, cachedInput = null, { quiet = false } = {}) {
    const cached = cachedInput ?? await findPreparedOfflineOrder(code);
    if (!cached) return null;
    const events = cached.payload.offlineProgressEvents ?? [];
    const lockboxViews = cached.payload.offlineLockboxViews ?? [];
    if (!events.length && !lockboxViews.length) return null;
    const response = await fetch('/api/assigned-work-order/offline-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Work-Order-Access-Code': code },
      body: JSON.stringify({ events, lockboxViews }),
      cache: 'no-store',
    });
    const body = await readResponse(response);
    if (!response.ok) throw new Error(errorMessage(body, text));
    if (body.data.purgeLocal) {
      await deletePreparedOfflineOrder(cached.record.assignmentId);
      setAccess(null);
      setActiveCode('');
      setOfflineMode(false);
      setOfflinePrepared(false);
      setRevealed({});
      if (!quiet) setNotice({ type: 'warning', message: text.offlineDataCleared });
      return body.data;
    }

    const conflictCount = (body.data.results ?? []).filter((item) => item.syncStatus === 'REVIEW_REQUIRED').length
      + (body.data.lockboxResults ?? []).filter((item) => item.reviewStatus === 'REVIEW_REQUIRED').length;
    const updatedPayload = {
      ...cached.payload,
      workOrder: {
        ...cached.payload.workOrder,
        status: body.data.currentStatus,
        updatedAt: body.data.currentUpdatedAt,
      },
      offlineProgressEvents: [],
      offlineLockboxViews: [],
    };
    const saved = await updatePreparedOfflineOrder(code, cached.record.assignmentId, () => updatedPayload);
    setAccess(removePreparedLockboxValues(saved));
    setOfflineMode(false);
    if (!quiet) setNotice(conflictCount
      ? { type: 'warning', message: text.offlineConflictsSent.replace('{count}', conflictCount) }
      : { type: 'success', message: text.offlineSyncComplete });
    return body.data;
  }

  async function loadOrder(code = codeInput) {
    setBusy(true);
    setNotice(null);
    const cleanCode = code.trim();
    try {
      const response = await fetch('/api/assigned-work-order', {
        headers: { 'X-Work-Order-Access-Code': cleanCode },
        cache: 'no-store',
      });
      const body = await readResponse(response);
      if (!response.ok) {
        const cached = await findPreparedOfflineOrder(cleanCode);
        if (cached && body?.error?.code === 'WORK_ORDER_ACCESS_INVALID') {
          try {
            const syncResult = await syncQueuedOffline(cleanCode, cached, { quiet: true });
            if (syncResult?.purgeLocal || (!cached.payload.offlineProgressEvents?.length && !cached.payload.offlineLockboxViews?.length)) {
              await deletePreparedOfflineOrder(cached.record.assignmentId);
              setActiveCode('');
              setAccess(null);
              setOfflineMode(false);
              setOfflinePrepared(false);
              setNotice({ type: 'error', message: text.employeeAccessInvalid });
              return;
            }
          } catch {
            await loadFromOfflineCache(cleanCode);
            return;
          }
        }
        throw new Error(errorMessage(body, text));
      }
      setActiveCode(cleanCode);
      setAccess(body.data);
      setOfflineMode(false);
      const cached = await findPreparedOfflineOrder(cleanCode);
      setOfflinePrepared(Boolean(cached));
      setRevealed({});
      if (cached) {
        try {
          const syncResult = await syncQueuedOffline(cleanCode, cached, { quiet: true });
          if (syncResult?.purgeLocal) {
            setActiveCode('');
            setAccess(null);
            setOfflinePrepared(false);
            setNotice({ type: 'warning', message: text.offlineDataCleared });
            return;
          }
          const refreshedCache = await findPreparedOfflineOrder(cleanCode);
          if (refreshedCache) {
            const cachedLockboxes = new Map(refreshedCache.payload.workOrder.property.accessData.map((item) => [item.id, item.value]));
            const updatedPayload = {
              ...refreshedCache.payload,
              ...body.data,
              workOrder: {
                ...refreshedCache.payload.workOrder,
                ...body.data.workOrder,
                property: {
                  ...body.data.workOrder.property,
                  accessData: body.data.workOrder.property.accessData.map((item) => ({
                    ...item,
                    ...(cachedLockboxes.has(item.id) ? { value: cachedLockboxes.get(item.id) } : {}),
                  })),
                },
              },
              offlineProgressEvents: refreshedCache.payload.offlineProgressEvents ?? [],
              offlineLockboxViews: refreshedCache.payload.offlineLockboxViews ?? [],
            };
            await updatePreparedOfflineOrder(cleanCode, refreshedCache.record.assignmentId, () => updatedPayload);
          }
        } catch { /* Retain encrypted prepared data and its outbox for another sync attempt. */ }
      }
    } catch (error) {
      const cached = await findPreparedOfflineOrder(cleanCode).catch(() => null);
      if ((!navigator.onLine || error instanceof TypeError) && cached) {
        await loadFromOfflineCache(cleanCode);
      } else {
        setActiveCode('');
        setAccess(null);
        setOfflineMode(false);
        setOfflinePrepared(false);
        setNotice({ type: 'error', message: error.message || text.employeeAccessInvalid });
      }
    } finally {
      setBusy(false);
    }
  }

  async function prepareOfflineOrder() {
    setBusy(true);
    setNotice(null);
    try {
      const existing = await findPreparedOfflineOrder(activeCode);
      if ((existing?.payload.offlineProgressEvents?.length ?? 0) || (existing?.payload.offlineLockboxViews?.length ?? 0)) {
        const synced = await syncQueuedOffline(activeCode, existing, { quiet: true });
        if (synced?.purgeLocal) throw new Error(text.employeeAccessInvalid);
      }
      const response = await fetch('/api/assigned-work-order/prepare-offline', {
        method: 'POST',
        headers: { 'X-Work-Order-Access-Code': activeCode },
        cache: 'no-store',
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(body, text));
      const payload = { ...body.data, offlineProgressEvents: [], offlineLockboxViews: [] };
      await savePreparedOfflineOrder(activeCode, payload);
      setAccess(removePreparedLockboxValues(payload));
      setOfflineMode(false);
      setOfflinePrepared(true);
      setNotice({ type: 'success', message: text.offlinePrepared });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.offlinePrepareFailed });
    } finally {
      setBusy(false);
    }
  }

  async function queueOfflineProgress({ stage = null, includeNote = false }) {
    const cached = await findPreparedOfflineOrder(activeCode);
    if (!cached) throw new Error(text.offlineMustPrepare);
    const payload = cached.payload;
    const pending = payload.offlineProgressEvents ?? [];
    if (pending.length >= 50) throw new Error(text.offlineQueueFull);
    const event = {
      clientEventId: crypto.randomUUID(),
      stage,
      note: includeNote ? note.trim() || null : null,
      baseStatus: payload.workOrder.status,
      baseWorkOrderUpdatedAt: payload.workOrder.updatedAt,
      requestedStatus: stage === 'COMPLETED' ? 'COMPLETED' : stage ? 'IN_PROGRESS' : payload.workOrder.status,
      deviceOccurredAt: new Date().toISOString(),
    };
    const updatedPayload = {
      ...payload,
      workOrder: {
        ...payload.workOrder,
        status: event.requestedStatus,
        progressEvents: [...payload.workOrder.progressEvents, {
          id: event.clientEventId,
          stage,
          note: event.note,
          occurredAt: event.deviceOccurredAt,
        }],
      },
      offlineProgressEvents: [...pending, event],
    };
    const saved = await updatePreparedOfflineOrder(activeCode, cached.record.assignmentId, () => updatedPayload);
    setAccess(saved);
    setOfflineMode(true);
    setNote('');
    setNotice({ type: 'warning', message: text.offlineProgressQueued });
  }

  async function queueOfflineLockboxView(credentialId) {
    const cached = await findPreparedOfflineOrder(activeCode);
    if (!cached) throw new Error(text.offlineMustPrepare);
    const views = cached.payload.offlineLockboxViews ?? [];
    if (views.some((view) => view.credentialId === credentialId)) {
      const credential = cached.payload.workOrder.property.accessData.find((item) => item.id === credentialId);
      setRevealed((current) => ({ ...current, [credentialId]: credential?.value }));
      return;
    }
    if (views.length >= 50) throw new Error(text.offlineQueueFull);
    const credential = cached.payload.workOrder.property.accessData.find((item) => item.id === credentialId);
    if (!credential?.value) throw new Error(text.offlineLockboxNotPrepared);
    const updatedPayload = {
      ...cached.payload,
      offlineLockboxViews: [...views, {
        clientEventId: crypto.randomUUID(),
        credentialId,
        deviceOccurredAt: new Date().toISOString(),
      }],
    };
    const saved = await updatePreparedOfflineOrder(activeCode, cached.record.assignmentId, () => updatedPayload);
    setAccess(saved);
    setOfflineMode(true);
    setRevealed((current) => ({ ...current, [credentialId]: credential.value }));
    setNotice({ type: 'warning', message: text.offlineLockboxAuditQueued });
  }

  async function syncPendingOfflineEvents() {
    if (!activeCode || !offlinePrepared) return;
    setSyncingOffline(true);
    try {
      await loadOrder(activeCode);
    } catch {
      setNotice({ type: 'warning', message: text.offlineSyncFailed });
    } finally {
      setSyncingOffline(false);
    }
  }

  useEffect(() => {
    const handleOnline = () => { syncPendingOfflineEvents(); };
    const handleOffline = () => {
      if (activeCode && offlinePrepared) loadFromOfflineCache(activeCode);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeCode, offlinePrepared]);

  async function writeProgress({ stage = null, includeNote = false }) {
    setBusy(true);
    setNotice(null);
    try {
      if (!navigator.onLine || offlineMode) {
        await queueOfflineProgress({ stage, includeNote });
        return;
      }
      if (offlinePrepared) {
        const pending = await syncQueuedOffline(activeCode, null, { quiet: true });
        if (pending?.purgeLocal) throw new Error(text.employeeAccessInvalid);
      }
      const response = await fetch('/api/assigned-work-order/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Work-Order-Access-Code': activeCode },
        body: JSON.stringify({ stage, note: includeNote ? note : null }),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(body, text));
      setNote('');
      if (stage === 'COMPLETED') {
        setAccess((current) => ({
          ...current,
          workOrder: {
            ...current.workOrder,
            status: 'COMPLETED',
            progressEvents: [...current.workOrder.progressEvents, body.data],
          },
        }));
        setActiveCode('');
        setRevealed({});
        const cached = await findPreparedOfflineOrder(activeCode);
        if (cached) await deletePreparedOfflineOrder(cached.record.assignmentId);
        setOfflinePrepared(false);
        setNotice({ type: 'success', message: text.employeeWorkCompleted });
      } else {
        await loadOrder(activeCode);
        setNotice({ type: 'success', message: text.progressSaved });
      }
    } catch (error) {
      if (error instanceof TypeError && offlinePrepared) {
        try {
          await queueOfflineProgress({ stage, includeNote });
          return;
        } catch (offlineError) {
          setNotice({ type: 'error', message: offlineError.message || text.offlineMustPrepare });
          return;
        }
      }
      if (error.message === text.employeeAccessInvalid) {
        if (offlinePrepared && activeCode) {
          try {
            const syncResult = await syncQueuedOffline(activeCode);
            if (syncResult?.purgeLocal) {
              setNotice({ type: 'warning', message: text.offlineDataCleared });
              return;
            }
            const cached = await findPreparedOfflineOrder(activeCode);
            if (cached && !(cached.payload.offlineProgressEvents?.length) && !(cached.payload.offlineLockboxViews?.length)) {
              await deletePreparedOfflineOrder(cached.record.assignmentId);
            }
          } catch {
            setNotice({ type: 'warning', message: text.offlineSyncFailed });
            return;
          }
        }
        setAccess(null);
        setActiveCode('');
        setRevealed({});
        setOfflineMode(false);
        setOfflinePrepared(false);
      }
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function revealCredential(credentialId) {
    setBusy(true);
    setNotice(null);
    if (!navigator.onLine || offlineMode) {
      try {
        await queueOfflineLockboxView(credentialId);
      } catch (error) {
        setNotice({ type: 'error', message: error.message || text.offlineLockboxNotPrepared });
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const response = await fetch(`/api/assigned-work-order/access-credentials/${encodeURIComponent(credentialId)}/reveal`, {
        method: 'POST',
        headers: { 'X-Work-Order-Access-Code': activeCode },
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(body, text));
      setRevealed((current) => ({ ...current, [credentialId]: body.data.value }));
    } catch (error) {
      if (error instanceof TypeError && offlinePrepared) {
        try {
          const cached = await findPreparedOfflineOrder(activeCode);
          if (!cached) throw new Error(text.offlineMustPrepare);
          setAccess(cached.payload);
          setOfflineMode(true);
          await queueOfflineLockboxView(credentialId);
          return;
        } catch (offlineError) {
          setNotice({ type: 'error', message: offlineError.message || text.offlineLockboxNotPrepared });
          return;
        } finally {
          setBusy(false);
        }
      }
      setRevealed({});
      if (error.message === text.employeeAccessInvalid) {
        setAccess(null);
        setActiveCode('');
      }
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  const workOrder = access?.workOrder;
  const canUpdate = access?.employee.canUpdateProgress && !['COMPLETED', 'CANCELED'].includes(workOrder?.status);
  const canAddNotes = access?.employee.canAddNotes && !['COMPLETED', 'CANCELED'].includes(workOrder?.status);
  const isSpanish = text.language === 'es' || text.acceptEstimate === 'Aceptar presupuesto';

  return (
    <section className="auth-card workspace-card employee-order-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.assignedWorkOrderTitle}</h1>
      {notice && <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>}

      {!workOrder && (
        <form
          className="auth-form"
          onSubmit={(event) => { event.preventDefault(); loadOrder(); }}
        >
          <p className="description">{text.employeeAccessInstructions}</p>
          <label>{text.workOrderAccessCode}
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              required
            />
          </label>
          <button className="primary-link" type="submit" disabled={busy}>{busy ? text.loadingWorkspaces : text.openAssignedWorkOrder}</button>
        </form>
      )}

      {workOrder && (
        <div className="assigned-order-content">
          {offlineMode && <p className="form-notice warning">{text.offlineRevocationNotice}</p>}
          <div className="estimate-card">
            <strong>OT-{workOrder.number} · {workOrder.title}</strong>
            <span>{workOrder.propertyAddressSnapshot}</span>
            <span>{text.workOrderStatus}: {workOrder.status}</span>
            {workOrder.scheduledStartAt && <span>{text.schedule}: {dateLabel(workOrder.scheduledStartAt, workOrder.timeZone, isSpanish)}</span>}
            <p>{workOrder.scopeSnapshot}</p>
            {workOrder.lines.map((line) => (
              <p className="form-footnote" key={line.id}>{line.quantity} × {line.description}</p>
            ))}
            {workOrder.additionalWork?.map((additional) => (
              <div className="approved-additional-work" key={additional.id}>
                <strong>{text.approvedAdditionalWork}: {additional.title}</strong>
                <span>{additional.description}</span>
              </div>
            ))}
          </div>
          <div className="offline-order-actions">
            {!offlinePrepared && workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELED' && (
              <button className="secondary-button" type="button" disabled={busy || !navigator.onLine} onClick={prepareOfflineOrder}>{text.offlinePrepareButton}</button>
            )}
            {offlinePrepared && <span className="form-footnote">{text.offlinePrepared}</span>}
            {offlinePrepared && navigator.onLine && <button className="secondary-button" type="button" disabled={busy || syncingOffline} onClick={syncPendingOfflineEvents}>{syncingOffline ? text.saving : text.syncOfflineNow}</button>}
          </div>

          {workOrder.property.accessData.length > 0 && (
            <section className="crm-section">
              <h2>{text.orderAccessDetails}</h2>
              <p className="form-footnote">{text.lockboxAuditNotice}</p>
              {workOrder.property.accessData.map((credential) => (
                <div className="workspace-row" key={credential.id}>
                  <span>{credential.label}</span>
                  {revealed[credential.id]
                    ? <><code className="revealed-value">{revealed[credential.id]}</code><button className="secondary-button" type="button" onClick={() => setRevealed((current) => ({ ...current, [credential.id]: null }))}>{text.hideValue}</button></>
                    : <button className="secondary-button" type="button" disabled={busy || (!navigator.onLine && !offlinePrepared)} onClick={() => revealCredential(credential.id)}>{text.reveal}</button>}
                </div>
              ))}
            </section>
          )}

          {(access.employee.canUploadPhotos || access.employee.canUploadVideos) && (
            <WorkOrderMediaPanel
              workOrder={workOrder}
              employeeCode={activeCode}
              permissions={access.employee}
              text={text}
            />
          )}

          {canUpdate && (
            <section className="crm-section">
              <h2>{text.updateProgress}</h2>
              <div className="employee-progress-actions">
                <button className="secondary-button" type="button" disabled={busy || (!navigator.onLine && !offlinePrepared)} onClick={() => writeProgress({ stage: 'STARTED' })}>{text.progressStarted}</button>
                <button className="secondary-button" type="button" disabled={busy || (!navigator.onLine && !offlinePrepared)} onClick={() => writeProgress({ stage: 'IN_PROGRESS' })}>{text.progressInProgress}</button>
                <button className="primary-link" type="button" disabled={busy || (!navigator.onLine && !offlinePrepared)} onClick={() => writeProgress({ stage: 'COMPLETED', includeNote: true })}>{text.progressCompleted}</button>
              </div>
            </section>
          )}

          {canAddNotes && (
            <form className="auth-form crm-form" onSubmit={(event) => { event.preventDefault(); writeProgress({ includeNote: true }); }}>
              <label>{text.addWorkNote}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength="5000" rows="3" /></label>
              <button className="secondary-button" type="submit" disabled={busy || !note.trim() || (!navigator.onLine && !offlinePrepared)}>{text.saveNote}</button>
            </form>
          )}

          <section className="crm-section">
            <h2>{text.progressHistory}</h2>
            {workOrder.progressEvents.map((event) => (
              <p className="form-footnote" key={event.id}>
                {event.stage ? text[`progress${event.stage === 'STARTED' ? 'Started' : event.stage === 'IN_PROGRESS' ? 'InProgress' : 'Completed'}`] : text.noteAdded}
                {event.note ? ` · ${event.note}` : ''}
              </p>
            ))}
          </section>
          {workOrder.status === 'COMPLETED' && <p className="form-footnote">{offlineMode ? text.offlineCompletionQueued : text.employeeWorkCompleted}</p>}
        </div>
      )}
    </section>
  );
}
