import { useEffect, useState } from 'react';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function requestError(body, text) {
  if (body?.error?.code === 'APPOINTMENT_LINK_INVALID') return text.appointmentLinkInvalid;
  if (body?.error?.code === 'INVALID_SCHEDULE_TIME') return text.invalidRequestedTime;
  return text.genericError;
}

function formatAppointment(instant, timeZone, isSpanish) {
  return new Intl.DateTimeFormat(isSpanish ? 'es-US' : 'en-US', {
    timeZone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(instant));
}

export function AppointmentResponsePage({ text }) {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [appointment, setAppointment] = useState(null);
  const [type, setType] = useState('CONFIRM');
  const [proposedStartAtLocal, setProposedStartAtLocal] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const isSpanish = text.acceptEstimate === 'Aceptar presupuesto';

  useEffect(() => {
    window.history.replaceState({}, document.title, '/appointment-response');
    if (!token) {
      setNotice({ type: 'error', message: text.appointmentLinkInvalid });
      return;
    }
    setBusy(true);
    fetch('/api/public/appointments/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    }).then(async (response) => {
      const body = await readResponse(response);
      if (!response.ok) throw new Error(requestError(body, text));
      setAppointment(body.data);
      setNotice(null);
    }).catch((error) => setNotice({ type: 'error', message: error.message || text.appointmentLinkInvalid }))
      .finally(() => setBusy(false));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/public/appointments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type, reason: reason || null, proposedStartAtLocal: type === 'RESCHEDULE' ? proposedStartAtLocal : null }),
        cache: 'no-store',
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(requestError(body, text));
      setAppointment((current) => ({ ...current, responseStatus: body.data.status }));
      setNotice({
        type: 'success',
        message: body.data.status === 'CONFIRMED' ? text.appointmentConfirmed : text.appointmentRequestPending,
      });
      setType('CONFIRM');
      setReason('');
      setProposedStartAtLocal('');
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.appointmentResponseTitle}</h1>
      {notice && <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>}
      {busy && !appointment && <p className="form-footnote">{text.loadingAppointment}</p>}
      {appointment && !appointment.responseStatus && (
        <>
          <div className="estimate-card">
            <strong>OT-{appointment.workOrderNumber} · {appointment.title}</strong>
            <span>{appointment.propertyAddress}</span>
            <span>{text.scheduledFor}: {formatAppointment(appointment.scheduledStartAt, appointment.timeZone, isSpanish)}</span>
            <span className="form-footnote">{text.appointmentTimeZone} {appointment.timeZone}</span>
          </div>
          <form className="auth-form crm-form" onSubmit={submit}>
            <label>{text.appointmentResponse}
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="CONFIRM">{text.confirmAppointment}</option>
                <option value="RESCHEDULE">{text.requestReschedule}</option>
                <option value="CANCEL">{text.requestCancellation}</option>
              </select>
            </label>
            {type === 'RESCHEDULE' && <label>{text.proposedAppointmentTime}
              <input type="datetime-local" value={proposedStartAtLocal} onChange={(event) => setProposedStartAtLocal(event.target.value)} required />
            </label>}
            {type !== 'CONFIRM' && <label>{text.requestReason}
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength="1000" rows="3" required />
            </label>}
            <p className="form-footnote">{text.scheduleChangePendingNotice}</p>
            <button className="primary-link" type="submit" disabled={busy}>{text.submitAppointmentResponse}</button>
          </form>
        </>
      )}
      {appointment?.responseStatus === 'CONFIRMED' && <p className="form-footnote">{text.appointmentConfirmed}</p>}
      {appointment?.responseStatus === 'PENDING' && <p className="form-footnote">{text.appointmentRequestPending}</p>}
    </section>
  );
}
