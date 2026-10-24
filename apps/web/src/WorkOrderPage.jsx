import { useEffect, useState } from 'react';
import { WorkOrderActualsPanel } from './WorkOrderActualsPanel.jsx';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

async function postJson(url, method, data) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { response, body: await readResponse(response) };
}

function errorMessage(body, text) {
  switch (body?.error?.code) {
    case 'RESOURCE_NOT_FOUND': return text.workspaceNotFound;
    case 'INVALID_WORK_ORDER_RECIPIENT': return text.invalidEstimateRecipient;
    case 'INVALID_WORK_ORDER_PROPERTY': return text.propertyRequired;
    case 'INVALID_WORK_ORDER_STATUS':
    case 'INVALID_WORK_ORDER_TRANSITION': return text.invalidWorkOrderStatus;
    case 'WORK_ORDER_REASON_REQUIRED': return text.workOrderReasonRequired;
    case 'INVALID_SCHEDULE_TIME': return text.invalidScheduleTime;
    case 'INVALID_SCHEDULE_DURATION': return text.invalidScheduleDuration;
    case 'INVALID_WORK_ORDER_PRIORITY': return text.invalidWorkOrderPriority;
    case 'WORK_ORDER_LOCKED': return text.workOrderLocked;
    case 'WORK_ORDER_SCHEDULE_REQUIRED': return text.scheduleRequired;
    case 'INVALID_EMPLOYEE_EMAIL': return text.invalidEmployeeEmail;
    case 'INVALID_EMAIL': return text.invalidEmail;
    case 'EMPLOYEE_EMAIL_REQUIRED': return text.employeeEmailRequired;
    case 'WORK_ORDER_ASSIGNMENT_EXISTS': return text.assignmentExists;
    case 'WORK_ORDER_OWNER_ALREADY_ASSIGNED': return text.ownerAlreadyAssigned;
    case 'UNSUPPORTED_ASSIGNMENT_CHANNEL': return text.accessCodeEmailOnly;
    case 'WORK_ORDER_CONTACT_METHOD_REQUIRED':
    case 'INVALID_WORK_ORDER_CONTACT_TYPE':
    case 'SCHEDULE_RECIPIENT_REQUIRED': return text.appointmentContactRequired;
    case 'APPOINTMENT_NOT_SCHEDULED': return text.appointmentNotScheduled;
    case 'APPOINTMENT_ALREADY_STARTED': return text.appointmentNotScheduled;
    case 'SCHEDULE_CHANGE_NOT_PENDING': return text.scheduleChangeAlreadyDecided;
    case 'SCHEDULE_CHANGE_STALE': return text.scheduleChangeStale;
    case 'APPOINTMENT_LINK_INVALID': return text.appointmentLinkInvalid;
    case 'OFFLINE_EVENT_NOT_REVIEWABLE': return text.offlineEventResolved;
    case 'OFFLINE_EVENT_ORDER_TERMINAL': return text.offlineTerminalOrder;
    case 'OFFLINE_EVENT_CONFLICT': return text.offlineEventConflict;
    case 'ESTIMATE_NOT_ACCEPTED': return text.estimateNotAccepted;
    case 'ESTIMATE_ALREADY_CONVERTED': return text.estimateAlreadyConverted;
    default: return text.genericError;
  }
}

function Notice({ value }) {
  if (!value) return null;
  return <p className={`form-notice ${value.type}`} role="status">{value.message}</p>;
}

function formatLocalInput(instant, timeZone) {
  if (!instant) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function formatSchedule(instant, timeZone, isSpanish) {
  if (!instant) return null;
  return new Intl.DateTimeFormat(isSpanish ? 'es-US' : 'en-US', {
    timeZone: timeZone || 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(instant));
}

function localDateKey(instant, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function monthGrid(monthDate) {
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + dayCount) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month, 1 - firstWeekday + index));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    return { key, day: date.getUTCDate(), currentMonth: date.getUTCMonth() === month };
  });
}

export function WorkOrdersPage({ workspaceId, text }) {
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}`;
  const [orders, setOrders] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignmentsByOrder, setAssignmentsByOrder] = useState({});
  const [scheduleRequestsByOrder, setScheduleRequestsByOrder] = useState({});
  const [offlineEventsByOrder, setOfflineEventsByOrder] = useState({});
  const [contactDrafts, setContactDrafts] = useState({});
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState({});
  const [customers, setCustomers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [timeZone, setTimeZone] = useState('UTC');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const current = new Date();
    return new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 15, 12));
  });
  const [calendarVisible, setCalendarVisible] = useState(true);
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [recipientType, setRecipientType] = useState('CUSTOMER');
  const [recipientId, setRecipientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });
  const [statusLabels] = useState({
    PENDING_SCHEDULE: text.statusPendingSchedule,
    SCHEDULED: text.statusScheduled,
    IN_PROGRESS: text.statusInProgress,
    COMPLETED: text.statusCompleted,
    RESCHEDULED: text.statusRescheduled,
    CANCELED: text.statusCanceled,
  });

  async function getData(path) {
    const response = await fetch(`${base}/${path}`);
    const body = await readResponse(response);
    if (!response.ok) throw new Error(errorMessage(body, text));
    return body.data ?? [];
  }

  async function refresh() {
    const [orderData, estimateData, requestData, customerData, managerData, propertyData, employeeData, workspaceResponse] = await Promise.all([
      getData('work-orders'),
      getData('estimates'),
      getData('requests'),
      getData('customers'),
      getData('property-managers'),
      getData('properties'),
      getData('employees'),
      fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`).then(readResponse),
    ]);
    const assignmentLists = await Promise.all(orderData.map((order) =>
      getData(`work-orders/${encodeURIComponent(order.id)}/assignments`)));
    const scheduleRequestLists = await Promise.all(orderData.map((order) =>
      getData(`work-orders/${encodeURIComponent(order.id)}/schedule-change-requests`)));
    const offlineLists = await Promise.all(orderData.map((order) =>
      getData(`work-orders/${encodeURIComponent(order.id)}/offline-progress`)));
    if (workspaceResponse?.data?.timeZone) setTimeZone(workspaceResponse.data.timeZone);
    setOrders(orderData);
    setEmployees(employeeData);
    setAssignmentsByOrder(Object.fromEntries(orderData.map((order, index) => [order.id, assignmentLists[index]])));
    setScheduleRequestsByOrder(Object.fromEntries(orderData.map((order, index) => [order.id, scheduleRequestLists[index]])));
    setOfflineEventsByOrder(Object.fromEntries(orderData.map((order, index) => [order.id, offlineLists[index]])));
    setContactDrafts(Object.fromEntries(orderData.map((order) => [order.id, order.contact
      ? { ...order.contact }
      : { type: order.propertyManagerId ? 'TENANT' : 'CUSTOMER_CONTACT', name: '', email: '', phone: '' }])));
    const timezone = workspaceResponse?.data?.timeZone ?? 'UTC';
    setScheduleDrafts(Object.fromEntries(orderData.map((order) => [order.id, {
      startAtLocal: formatLocalInput(order.scheduledStartAt, timezone),
      durationMinutes: String(order.estimatedDurationMinutes ?? 60),
    }])));
    setEstimates(estimateData);
    setRequests(requestData);
    setCustomers(customerData);
    setManagers(managerData);
    setProperties(propertyData);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workspaceId]);

  async function createDirect(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const isCustomer = recipientType === 'CUSTOMER';
    const input = {
      ...(isCustomer ? { customerId: recipientId } : { propertyManagerId: recipientId }),
      propertyId: fields.propertyId,
      serviceRequestId: fields.serviceRequestId || null,
      title: fields.title,
      scope: fields.scope,
      pricingType: fields.pricingType,
      agreedTotal: fields.agreedTotal || null,
    };
    try {
      const { response, body } = await postJson(`${base}/work-orders`, 'POST', input);
      if (!response.ok) throw new Error(errorMessage(body, text));
      form.reset();
      setRecipientType('CUSTOMER');
      setRecipientId('');
      await refresh();
      setNotice({ type: 'success', message: `${text.workOrderCreated} ${text.workOrderNumber} OT-${body.data.number}.` });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function convertEstimate(estimateId) {
    setBusy(true);
    setNotice(null);
    try {
      const { response, body } = await postJson(`${base}/work-orders/from-estimate/${encodeURIComponent(estimateId)}`, 'POST', {});
      if (!response.ok) throw new Error(errorMessage(body, text));
      await refresh();
      setNotice({ type: 'success', message: `${text.workOrderCreated} ${text.workOrderNumber} OT-${body.data.number}.` });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(workOrder, status) {
    if (['CANCELED', 'COMPLETED'].includes(status) && !window.confirm(text.offlineRevocationWarning)) return;
    const reasonNeeded = ['CANCELED', 'RESCHEDULED', 'PENDING_SCHEDULE'].includes(status);
    const reason = reasonNeeded ? window.prompt(text.workOrderReasonPrompt) : null;
    if (reasonNeeded && !reason?.trim()) return;
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/status`,
      'PATCH',
      { status, reason },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
  }

  function updateScheduleDraft(workOrderId, field, value) {
    setScheduleDrafts((current) => ({
      ...current,
      [workOrderId]: { ...current[workOrderId], [field]: value },
    }));
  }

  async function saveSchedule(workOrder) {
    const draft = scheduleDrafts[workOrder.id] ?? {};
    const changed = workOrder.scheduledStartAt
      && formatLocalInput(workOrder.scheduledStartAt, timeZone) !== draft.startAtLocal;
    const reason = changed ? window.prompt(text.scheduleReasonPrompt) : null;
    if (changed && reason === null) return;
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/schedule`,
      'PUT',
      { ...draft, reason: reason?.trim() || null },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    const conflicts = body.data.scheduleConflicts ?? [];
    await refresh();
    setNotice(conflicts.length
      ? {
        type: 'warning',
        message: `${text.scheduleConflicts.replace('{count}', conflicts.length)} ${conflicts.map((conflict) => `OT-${conflict.number} ${conflict.title}`).join(', ')}`,
      }
      : { type: 'success', message: text.scheduleSaved });
  }

  async function updatePriority(workOrderId, priority) {
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrderId)}/priority`,
      'PATCH',
      { priority },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
  }

  async function assignEmployee(workOrder) {
    const employeeId = selectedEmployeeIds[workOrder.id];
    if (!employeeId) return;
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/assignments`,
      'POST',
      { employeeId, channel: 'EMAIL' },
    );
    if (!response.ok && response.status !== 207) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
    setNotice(body.data.deliveryStatus === 'FAILED'
      ? { type: 'error', message: text.assignmentDeliveryFailed }
      : { type: 'success', message: text.assignmentSaved });
  }

  async function assignOwner(workOrder) {
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/assignments`,
      'POST',
      { owner: true },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
    setNotice({ type: 'success', message: text.ownerAssigned });
  }

  async function updateAssignment(assignmentId, action) {
    if (action === 'revoke' && !window.confirm(text.offlineRevocationWarning)) return;
    const path = action === 'resend' ? 'resend-code' : 'revoke';
    const { response, body } = await postJson(
      `${base}/work-order-assignments/${encodeURIComponent(assignmentId)}/${path}`,
      'POST',
      {},
    );
    if (!response.ok && response.status !== 207) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
    setNotice(action === 'revoke'
      ? { type: 'success', message: text.assignmentRevoked }
      : body.data.deliveryStatus === 'FAILED'
        ? { type: 'error', message: text.assignmentDeliveryFailed }
        : { type: 'success', message: text.assignmentSaved });
  }

  function updateContact(workOrderId, field, value) {
    setContactDrafts((current) => ({
      ...current,
      [workOrderId]: { ...current[workOrderId], [field]: value },
    }));
  }

  async function saveAppointmentContact(workOrder) {
    const contact = contactDrafts[workOrder.id];
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/appointment-contact`,
      'PUT',
      contact,
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
    setNotice({ type: 'success', message: text.appointmentContactSaved });
  }

  async function sendAppointmentOptions(workOrder) {
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/send-appointment-options`,
      'POST',
      {},
    );
    if (!response.ok && response.status !== 207) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    setNotice(body.data.deliveryStatus === 'FAILED'
      ? { type: 'error', message: text.appointmentLinkFailed }
      : { type: 'success', message: text.appointmentLinkSent });
  }

  async function decideScheduleRequest(workOrder, request, decision) {
    if (request.type === 'CANCEL' && decision === 'APPROVE' && !window.confirm(text.offlineRevocationWarning)) return;
    const reason = decision === 'REJECT' ? window.prompt(text.rejectScheduleReasonPrompt) : '';
    if (decision === 'REJECT' && !reason?.trim()) return;
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/schedule-change-requests/${encodeURIComponent(request.id)}/decision`,
      'POST',
      { decision, reason: reason?.trim() || null },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    const conflicts = body.data.conflicts ?? [];
    await refresh();
    setNotice(decision === 'REJECT'
      ? { type: 'success', message: text.scheduleRequestRejected }
      : conflicts.length
        ? { type: 'warning', message: `${text.scheduleRequestConflict.replace('{count}', conflicts.length)} ${conflicts.map((item) => `OT-${item.number} ${item.title}`).join(', ')}` }
        : { type: 'success', message: text.scheduleRequestApproved });
  }

  async function resolveOfflineEvent(workOrder, event, decision) {
    const reason = window.prompt(text.offlineResolutionReasonPrompt);
    if (!reason?.trim()) return;
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/offline-progress/${encodeURIComponent(event.id)}/resolve`,
      'POST',
      { decision, reason: reason.trim() },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
    setNotice({ type: 'success', message: decision === 'APPLY' ? text.offlineEventApplied : text.offlineEventDismissed });
  }

  async function resolveOfflineAccess(workOrder, event, decision) {
    const reason = window.prompt(text.offlineResolutionReasonPrompt);
    if (!reason?.trim()) return;
    const { response, body } = await postJson(
      `${base}/work-orders/${encodeURIComponent(workOrder.id)}/offline-access-events/${encodeURIComponent(event.id)}/resolve`,
      'POST',
      { decision, reason: reason.trim() },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: errorMessage(body, text) });
      return;
    }
    await refresh();
    setNotice({ type: 'success', message: text.offlineAccessReviewed });
  }

  const convertedEstimateIds = new Set(orders.map((order) => order.estimate?.id).filter(Boolean));
  const readyEstimates = estimates.filter((estimate) => estimate.status === 'ACCEPTED' && !convertedEstimateIds.has(estimate.id));
  const recipientOptions = recipientType === 'CUSTOMER' ? customers : managers;
  const allowedNextStatuses = {
    PENDING_SCHEDULE: ['CANCELED'],
    SCHEDULED: ['IN_PROGRESS', 'RESCHEDULED', 'CANCELED'],
    IN_PROGRESS: ['COMPLETED', 'PENDING_SCHEDULE', 'RESCHEDULED', 'CANCELED'],
    RESCHEDULED: ['IN_PROGRESS', 'CANCELED'],
    COMPLETED: [],
    CANCELED: [],
  };
  const isSpanish = text.acceptEstimate === 'Aceptar presupuesto';
  const calendarLocale = isSpanish ? 'es-US' : 'en-US';
  const calendarMonthLabel = new Intl.DateTimeFormat(calendarLocale, { month: 'long', year: 'numeric', timeZone }).format(calendarMonth);
  const calendarCells = monthGrid(calendarMonth);
  const scheduledByDate = orders.reduce((groups, order) => {
    if (!order.scheduledStartAt || order.status === 'CANCELED') return groups;
    const dateKey = localDateKey(order.scheduledStartAt, timeZone);
    groups[dateKey] = [...(groups[dateKey] ?? []), order];
    return groups;
  }, {});
  const calendarWeekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, 5 + index, 12));
    return new Intl.DateTimeFormat(calendarLocale, { weekday: 'short', timeZone: 'UTC' }).format(date);
  });

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.workOrders}</h1>
      <p className="form-footnote"><a href={`/workspaces/${encodeURIComponent(workspaceId)}`}>{text.backToWorkspaces}</a></p>
      <Notice value={notice} />

      <div className="calendar-toolbar">
        <div className="estimate-actions">
          <button className="secondary-button" type="button" onClick={() => setCalendarVisible(true)}>{text.calendarView}</button>
          <button className="secondary-button" type="button" onClick={() => setCalendarVisible(false)}>{text.listView}</button>
        </div>
        {calendarVisible && (
          <div className="calendar-month-controls">
            <button className="secondary-button" type="button" aria-label={text.previousMonth} onClick={() => setCalendarMonth((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() - 1, 15, 12)))}>‹</button>
            <strong>{calendarMonthLabel}</strong>
            <button className="secondary-button" type="button" aria-label={text.nextMonth} onClick={() => setCalendarMonth((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 15, 12)))}>›</button>
          </div>
        )}
      </div>

      {calendarVisible && (
        <section className="work-order-calendar" aria-label={text.calendarView}>
          <p className="form-footnote">{text.scheduleTimeZone}: {timeZone}. {text.calendarConflictScope}</p>
          <div className="calendar-grid calendar-weekdays">{calendarWeekdays.map((weekday, index) => <strong key={`${weekday}-${index}`}>{weekday}</strong>)}</div>
          <div className="calendar-grid">
            {calendarCells.map((cell) => (
              <div className={`calendar-day${cell.currentMonth ? '' : ' outside-month'}`} key={cell.key}>
                <span>{cell.day}</span>
                {(scheduledByDate[cell.key] ?? []).map((order) => (
                  <div className="calendar-event" key={order.id}>
                    <strong>{new Intl.DateTimeFormat(calendarLocale, { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(order.scheduledStartAt))}</strong>
                    <span>OT-{order.number} · {order.title}</span>
                  </div>
                ))}
                {cell.currentMonth && !scheduledByDate[cell.key]?.length && <small>{text.noScheduledWork}</small>}
              </div>
            ))}
          </div>
        </section>
      )}

      {!calendarVisible && <div className="crm-list">
        {orders.map((order) => {
          const recipient = order.customer?.companyName || order.customer?.name
            || order.propertyManager?.companyName || order.propertyManager?.name || order.billToNameSnapshot;
          return (
            <article className="estimate-card" key={order.id}>
              <div className="estimate-heading">
                <div><strong>OT-{order.number} · {order.title}</strong><span>{recipient} · {order.propertyAddressSnapshot}</span></div>
                <span>{statusLabels[order.status]} · {text.billingPending}</span>
              </div>
              <p className="form-footnote">{order.scopeSnapshot}</p>
              {order.agreedTotal != null && <strong>{new Intl.NumberFormat(text.acceptEstimate === 'Aceptar presupuesto' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(Number(order.agreedTotal))}</strong>}
              <label>{text.priority}
                <select value={order.priority} disabled={['COMPLETED', 'CANCELED'].includes(order.status)} onChange={(event) => updatePriority(order.id, event.target.value)}>
                  <option value="LOW">{text.priorityLow}</option>
                  <option value="NORMAL">{text.priorityNormal}</option>
                  <option value="HIGH">{text.priorityHigh}</option>
                  <option value="URGENT">{text.priorityUrgent}</option>
                </select>
              </label>
              <label>{text.workOrderStatus}
                <select value={order.status} disabled={!allowedNextStatuses[order.status]?.length} onChange={(event) => updateStatus(order, event.target.value)}>
                  {[order.status, ...(allowedNextStatuses[order.status] ?? [])].map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
                </select>
              </label>
              <div className="schedule-editor">
                <strong>{text.schedule}</strong>
                <span className="form-footnote">{text.scheduleTimeZone}: {timeZone}</span>
                {order.scheduledStartAt && <span>{formatSchedule(order.scheduledStartAt, timeZone, text.acceptEstimate === 'Aceptar presupuesto')}</span>}
                <label>{text.scheduleStart}
                  <input
                    type="datetime-local"
                    value={scheduleDrafts[order.id]?.startAtLocal ?? ''}
                    onChange={(event) => updateScheduleDraft(order.id, 'startAtLocal', event.target.value)}
                    disabled={['COMPLETED', 'CANCELED'].includes(order.status)}
                  />
                </label>
                <label>{text.estimatedDuration}
                  <input
                    type="number"
                    min="15"
                    max="10080"
                    step="15"
                    value={scheduleDrafts[order.id]?.durationMinutes ?? '60'}
                    onChange={(event) => updateScheduleDraft(order.id, 'durationMinutes', event.target.value)}
                    disabled={['COMPLETED', 'CANCELED'].includes(order.status)}
                  />
                </label>
                {!['COMPLETED', 'CANCELED'].includes(order.status)
                  && <button className="secondary-button" type="button" onClick={() => saveSchedule(order)}>{text.schedule}</button>}
              {order.scheduleEvents?.length > 0 && (
                  <details className="version-history">
                    <summary>{text.scheduleHistory}</summary>
                    {order.scheduleEvents.map((event) => (
                      <p key={event.id}>{formatSchedule(event.nextStartAt, timeZone, text.acceptEstimate === 'Aceptar presupuesto')} · {event.durationMinutes} {text.durationMinutes}</p>
                    ))}
                  </details>
                )}
              </div>
              <section className="appointment-contact-panel">
                <strong>{text.appointmentContact}</strong>
                <p className="form-footnote">{text.appointmentContactRequired}</p>
                <label>{text.contactType}
                  <select value={contactDrafts[order.id]?.type ?? (order.propertyManagerId ? 'TENANT' : 'CUSTOMER_CONTACT')} onChange={(event) => updateContact(order.id, 'type', event.target.value)}>
                    <option value="TENANT">{text.contactTenant}</option>
                    <option value="CUSTOMER_CONTACT">{text.contactCustomer}</option>
                    <option value="OTHER">{text.contactOther}</option>
                  </select>
                </label>
                <div className="form-grid">
                  <label>{text.name}<input value={contactDrafts[order.id]?.name ?? ''} onChange={(event) => updateContact(order.id, 'name', event.target.value)} maxLength="160" /></label>
                  <label>{text.email}<input type="email" value={contactDrafts[order.id]?.email ?? ''} onChange={(event) => updateContact(order.id, 'email', event.target.value)} maxLength="254" /></label>
                  <label>{text.phone}<input type="tel" value={contactDrafts[order.id]?.phone ?? ''} onChange={(event) => updateContact(order.id, 'phone', event.target.value)} maxLength="40" /></label>
                </div>
                <div className="assignment-actions">
                  <button className="secondary-button" type="button" onClick={() => saveAppointmentContact(order)}>{text.saveAppointmentContact}</button>
                  <button className="secondary-button" type="button" disabled={!order.scheduledStartAt || ['COMPLETED', 'CANCELED'].includes(order.status)} onClick={() => sendAppointmentOptions(order)}>{text.sendAppointmentOptions}</button>
                </div>
              </section>
              {(scheduleRequestsByOrder[order.id] ?? []).length > 0 && (
                <section className="schedule-request-panel">
                  <strong>{text.scheduleChangeRequests}</strong>
                  {(scheduleRequestsByOrder[order.id] ?? []).map((request) => (
                    <div className="actual-record" key={request.id}>
                      <strong>{text[`scheduleRequestType${request.type}`]} · {text[`scheduleChange${request.status}`]}</strong>
                      <span>{request.requesterName}{request.requesterEmailSnapshot ? ` · ${request.requesterEmailSnapshot}` : ''}</span>
                      {request.reason && <span>{request.reason}</span>}
                      {request.proposedStartAt && <span>{text.proposedAppointmentTime}: {formatSchedule(request.proposedStartAt, timeZone, isSpanish)}</span>}
                      {request.status === 'PENDING' && (
                        <div className="assignment-actions">
                          <button className="primary-link" type="button" onClick={() => decideScheduleRequest(order, request, 'APPROVE')}>{text.approveScheduleRequest}</button>
                          <button className="secondary-button" type="button" onClick={() => decideScheduleRequest(order, request, 'REJECT')}>{text.rejectScheduleRequest}</button>
                        </div>
                      )}
                      {request.decisionReason && <span>{text.decisionReason}: {request.decisionReason}</span>}
                    </div>
                  ))}
                </section>
              )}
              {((offlineEventsByOrder[order.id]?.progressEvents ?? []).some((event) => event.syncStatus === 'REVIEW_REQUIRED')
                || (offlineEventsByOrder[order.id]?.sensitiveAccessEvents ?? []).some((event) => event.reviewStatus === 'REVIEW_REQUIRED')) && (
                <section className="schedule-request-panel">
                  <strong>{text.offlineReviewTitle}</strong>
                  <p className="form-footnote">{text.offlineReviewNotice}</p>
                  {(offlineEventsByOrder[order.id]?.progressEvents ?? []).filter((event) => event.syncStatus === 'REVIEW_REQUIRED').map((event) => (
                    <div className="actual-record" key={event.id}>
                      <strong>{event.assignment.employee.name} · {text.offlineProgressEvent}</strong>
                      <span>{event.stage ?? text.noteAdded}{event.note ? ` · ${event.note}` : ''}</span>
                      <span>{text.deviceTime}: {formatSchedule(event.deviceOccurredAt, timeZone, isSpanish)} · {text.receivedTime}: {formatSchedule(event.receivedAt, timeZone, isSpanish)}</span>
                      <span>{text.conflictReason}: {event.conflictReason}</span>
                      <div className="assignment-actions">
                        <button className="primary-link" type="button" onClick={() => resolveOfflineEvent(order, event, 'APPLY')}>{text.applyOfflineEvent}</button>
                        <button className="secondary-button" type="button" onClick={() => resolveOfflineEvent(order, event, 'DISMISS')}>{text.dismissOfflineEvent}</button>
                      </div>
                    </div>
                  ))}
                  {(offlineEventsByOrder[order.id]?.sensitiveAccessEvents ?? []).filter((event) => event.reviewStatus === 'REVIEW_REQUIRED').map((event) => (
                    <div className="actual-record" key={event.id}>
                      <strong>{event.assignment.employee.name} · {text.offlineLockboxEvent}</strong>
                      <span>{event.credential.label}</span>
                      <span>{text.deviceTime}: {formatSchedule(event.deviceOccurredAt, timeZone, isSpanish)} · {text.receivedTime}: {formatSchedule(event.occurredAt, timeZone, isSpanish)}</span>
                      <span>{text.conflictReason}: {event.conflictReason}</span>
                      <div className="assignment-actions">
                        <button className="secondary-button" type="button" onClick={() => resolveOfflineAccess(order, event, 'ACKNOWLEDGE')}>{text.acknowledgeOfflineAccess}</button>
                        <button className="secondary-button" type="button" onClick={() => resolveOfflineAccess(order, event, 'DISMISS')}>{text.dismissOfflineEvent}</button>
                      </div>
                    </div>
                  ))}
                </section>
              )}
              <section className="assignment-panel">
                <strong>{text.assignedEmployees}</strong>
                <p className="form-footnote">{text.accessCodeEmailOnly}</p>
                <p className="form-footnote">{text.employeeCodeEmailRequirement}</p>
                {(assignmentsByOrder[order.id] ?? []).map((assignment) => {
                  const latestCode = assignment.accessCodes?.[0];
                  const assigneeName = assignment.owner ? text.owner : assignment.employee?.name;
                  return (
                    <div className="workspace-row" key={assignment.id}>
                      <span>{assigneeName} · {assignment.revokedAt ? text.assignmentRevoked : assignment.employee && latestCode?.revokedAt ? text.accessCodeRevoked : assignment.employee ? text.accessCodeActive : ''}</span>
                      {!assignment.revokedAt && (
                        <div className="assignment-actions">
                          {assignment.employee && <button className="secondary-button" type="button" onClick={() => updateAssignment(assignment.id, 'resend')}>{text.resendAccessCode}</button>}
                          <button className="secondary-button" type="button" onClick={() => updateAssignment(assignment.id, 'revoke')}>{text.revokeAssignment}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!['COMPLETED', 'CANCELED'].includes(order.status) && (
                  <>
                    {!(assignmentsByOrder[order.id] ?? []).some((assignment) => assignment.ownerUserId && !assignment.revokedAt)
                      && <button className="secondary-button" type="button" onClick={() => assignOwner(order)}>{text.assignOwner}</button>}
                    <div className="form-grid assignment-create">
                    <label>{text.employees}
                      <select
                        value={selectedEmployeeIds[order.id] ?? ''}
                        onChange={(event) => setSelectedEmployeeIds((current) => ({ ...current, [order.id]: event.target.value }))}
                      >
                        <option value="">{text.selectParty}</option>
                        {employees.filter((employee) => employee.isActive && employee.email
                          && !(assignmentsByOrder[order.id] ?? []).some((assignment) => assignment.employeeId === employee.id && !assignment.revokedAt))
                          .map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                      </select>
                    </label>
                    <button className="secondary-button" type="button" disabled={!selectedEmployeeIds[order.id]} onClick={() => assignEmployee(order)}>{text.assignEmployee}</button>
                    </div>
                  </>
                )}
                {order.progressEvents?.length > 0 && (
                  <details className="version-history">
                    <summary>{text.progressHistory}</summary>
                    {order.progressEvents.map((event) => (
                      <p key={event.id}>{event.assignment.employee.name} · {event.stage ?? text.noteAdded}{event.note ? `: ${event.note}` : ''}</p>
                    ))}
                  </details>
                )}
              </section>
              <WorkOrderActualsPanel
                workspaceId={workspaceId}
                workOrder={order}
                employees={employees}
                timeZone={timeZone}
                text={text}
              />
            </article>
          );
        })}
      </div>}
      {!calendarVisible && orders.length === 0 && !notice && <p className="form-footnote">{text.noRecords}</p>}

      {readyEstimates.length > 0 && (
        <section className="crm-section">
          <h2>{text.convertEstimate}</h2>
          {readyEstimates.map((estimate) => (
            <div className="workspace-row" key={estimate.id}>
              <span>PRE-{estimate.number} · {estimate.versions?.[0]?.recipientNameSnapshot}</span>
              <button className="secondary-button" type="button" disabled={busy} onClick={() => convertEstimate(estimate.id)}>{text.createWorkOrder}</button>
            </div>
          ))}
        </section>
      )}

      <form className="auth-form crm-form" onSubmit={createDirect}>
        <h2>{text.createWorkOrder}</h2>
        <label>{text.estimateRecipientType}
          <select value={recipientType} onChange={(event) => { setRecipientType(event.target.value); setRecipientId(''); }}>
            <option value="CUSTOMER">{text.customers}</option>
            <option value="MANAGER">{text.propertyManagers}</option>
          </select>
        </label>
        <label>{recipientType === 'CUSTOMER' ? text.customers : text.propertyManagers}
          <select name="recipientId" value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required>
            <option value="" disabled>{text.selectParty}</option>
            {recipientOptions.map((record) => <option key={record.id} value={record.id}>{record.companyName || record.name}</option>)}
          </select>
        </label>
        <label>{text.properties}
          <select name="propertyId" required defaultValue="">
            <option value="" disabled>{text.selectProperty}</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.addressLine1}, {property.city}</option>)}
          </select>
        </label>
        <label>{text.linkedRequest}
          <select name="serviceRequestId" defaultValue="">
            <option value="">{text.none}</option>
            {requests.map((request) => <option key={request.id} value={request.id}>{request.requesterName}: {request.description.slice(0, 70)}</option>)}
          </select>
        </label>
        <label>{text.workOrderTitle}<input name="title" maxLength="200" required /></label>
        <label>{text.workOrderScope}<textarea name="scope" rows="3" maxLength="10000" required /></label>
        <label>{text.pricingType}
          <select name="pricingType" defaultValue="FIXED">
            <option value="FIXED">{text.fixedPrice}</option>
            <option value="TIME_AND_MATERIALS">{text.timeAndMaterials}</option>
          </select>
        </label>
        <label>{text.agreedTotal}<input name="agreedTotal" type="number" min="0" step="0.01" /></label>
        <button className="primary-link" type="submit" disabled={busy}>{text.createWorkOrder}</button>
      </form>
    </section>
  );
}
