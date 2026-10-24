import { useEffect, useState } from 'react';
import { WorkOrderMediaPanel } from './WorkOrderMediaPanel.jsx';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function formatLocalInput(instant, timeZone) {
  if (!instant) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
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

function formatDate(instant, timeZone, isSpanish) {
  return new Intl.DateTimeFormat(isSpanish ? 'es-US' : 'en-US', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(instant));
}

function actualsError(body, text) {
  switch (body?.error?.code) {
    case 'INVALID_WORK_LOG_RANGE':
    case 'INVALID_WORK_LOG_TIME': return text.invalidWorkLog;
    case 'INVALID_MATERIAL_PAYER':
    case 'MATERIAL_PAYER_REQUIRED': return text.materialPayerRequired;
    case 'MATERIAL_CHARGE_NOT_ALLOWED': return text.materialChargeFixed;
    case 'INVALID_ADJUSTMENT_TYPE':
    case 'INVALID_ADJUSTMENT_AMOUNT':
    case 'ADJUSTMENT_SCOPE_REQUIRED': return text.invalidAdjustment;
    case 'ADDITIONAL_WORK_CONFIRMATION_REQUIRED': return text.confirmCustomerAuthorizationRequired;
    case 'ADDITIONAL_WORK_ALREADY_DECIDED': return text.additionalWorkAlreadyDecided;
    case 'ADDITIONAL_WORK_CONFLICT': return text.additionalWorkConflict;
    case 'WORK_ORDER_LOCKED': return text.workOrderLocked;
    default: return text.genericError;
  }
}

function Notice({ value }) {
  if (!value) return null;
  return <p className={`form-notice ${value.type}`} role="status">{value.message}</p>;
}

export function WorkOrderActualsPanel({ workspaceId, workOrder, employees, timeZone, text }) {
  const endpoint = `/api/workspaces/${encodeURIComponent(workspaceId)}/work-orders/${encodeURIComponent(workOrder.id)}/actuals`;
  const [actuals, setActuals] = useState({ workLogs: [], materials: [], adjustments: [] });
  const [additionalWork, setAdditionalWork] = useState([]);
  const [workLog, setWorkLog] = useState({ startedAtLocal: '', endedAtLocal: '', note: '' });
  const [material, setMaterial] = useState({
    description: '',
    quantity: '1',
    unitCost: '',
    customerCharge: '',
    payerType: 'OWNER',
    payerEmployeeId: '',
    payerDescription: '',
  });
  const [adjustment, setAdjustment] = useState({ type: workOrder.pricingType === 'FIXED' ? 'SCOPE_CHANGE' : 'TIME_AND_MATERIALS_CHARGE', amountDelta: '0.00', reason: '', scopeChange: '' });
  const [additionalDraft, setAdditionalDraft] = useState({ title: '', reason: '', description: '', estimatedAmount: '' });
  const [approvalDrafts, setApprovalDrafts] = useState({});
  const [notice, setNotice] = useState(null);

  async function refresh() {
    const [actualsResponse, additionalResponse] = await Promise.all([
      fetch(endpoint),
      fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/work-orders/${encodeURIComponent(workOrder.id)}/additional-work`),
    ]);
    const [actualsBody, additionalBody] = await Promise.all([readResponse(actualsResponse), readResponse(additionalResponse)]);
    if (!actualsResponse.ok) throw new Error(actualsError(actualsBody, text));
    if (!additionalResponse.ok) throw new Error(actualsError(additionalBody, text));
    setActuals(actualsBody.data);
    setAdditionalWork(additionalBody.data ?? []);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workspaceId, workOrder.id]);

  async function send(path, method, data, reset) {
    setNotice(null);
    try {
      const response = await fetch(`${endpoint}/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(actualsError(body, text));
      reset?.();
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    }
  }

  async function sendAdditional(path, method, data, reset) {
    const additionalEndpoint = `/api/workspaces/${encodeURIComponent(workspaceId)}/work-orders/${encodeURIComponent(workOrder.id)}/additional-work`;
    setNotice(null);
    try {
      const response = await fetch(`${additionalEndpoint}${path ? `/${path}` : ''}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(actualsError(body, text));
      reset?.();
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    }
  }

  async function voidRecord(kind, id) {
    const reason = window.prompt(text.voidReasonPrompt);
    if (!reason?.trim()) return;
    const path = kind === 'workLog' ? `work-logs/${encodeURIComponent(id)}/void` : `materials/${encodeURIComponent(id)}/void`;
    await send(path, 'POST', { reason: reason.trim() });
  }

  async function decideAdditionalWork(item, decision) {
    if (decision === 'approve') {
      const data = approvalDrafts[item.id] ?? {};
      await sendAdditional(`${encodeURIComponent(item.id)}/approve`, 'POST', {
        authorizationMethod: data.authorizationMethod ?? 'IN_PERSON',
        authorizedByName: data.authorizedByName,
        authorizationDetails: data.authorizationDetails,
        approvedAmount: data.approvedAmount ?? item.estimatedAmount,
        confirmation: data.confirmation,
      });
      return;
    }
    const reason = window.prompt(text.additionalDecisionReasonPrompt);
    if (!reason?.trim()) return;
    await sendAdditional(`${encodeURIComponent(item.id)}/${decision}`, 'POST', { reason: reason.trim() });
  }

  function update(setter, field, value) {
    setter((current) => ({ ...current, [field]: value }));
  }

  const isSpanish = text.acceptEstimate === 'Aceptar presupuesto';
  const activeEmployees = employees.filter((employee) => employee.isActive);

  return (
    <section className="actuals-panel">
      <h3>{text.workActuals}</h3>
      <p className="form-footnote">{text.actualsAccountingNotice}</p>
      <p className="form-footnote">{text.additionalAuthorizationNotice}</p>
      <Notice value={notice} />

      <details>
        <summary>{text.addWorkLog}</summary>
        <form className="auth-form actuals-form" onSubmit={(event) => {
          event.preventDefault();
          send('work-logs', 'POST', workLog, () => setWorkLog({ startedAtLocal: '', endedAtLocal: '', note: '' }));
        }}>
          <div className="form-grid">
            <label>{text.workLogStart}<input type="datetime-local" value={workLog.startedAtLocal} onChange={(event) => update(setWorkLog, 'startedAtLocal', event.target.value)} required /></label>
            <label>{text.workLogEnd}<input type="datetime-local" value={workLog.endedAtLocal} onChange={(event) => update(setWorkLog, 'endedAtLocal', event.target.value)} required /></label>
          </div>
          <label>{text.notes}<textarea value={workLog.note} onChange={(event) => update(setWorkLog, 'note', event.target.value)} maxLength="2000" rows="2" /></label>
          <button className="secondary-button" type="submit">{text.addWorkLog}</button>
        </form>
      </details>

      <details>
        <summary>{text.addMaterial}</summary>
        <form className="auth-form actuals-form" onSubmit={(event) => {
          event.preventDefault();
          send('materials', 'POST', {
            ...material,
            customerCharge: workOrder.pricingType === 'TIME_AND_MATERIALS' ? (material.customerCharge || null) : null,
            payerEmployeeId: material.payerType === 'EMPLOYEE' ? material.payerEmployeeId : null,
            payerDescription: material.payerType === 'OTHER' ? material.payerDescription : null,
          }, () => setMaterial({ description: '', quantity: '1', unitCost: '', customerCharge: '', payerType: 'OWNER', payerEmployeeId: '', payerDescription: '' }));
        }}>
          <label>{text.materialDescription}<input value={material.description} onChange={(event) => update(setMaterial, 'description', event.target.value)} maxLength="500" required /></label>
          <div className="form-grid">
            <label>{text.quantity}<input type="number" min="0.01" step="0.01" value={material.quantity} onChange={(event) => update(setMaterial, 'quantity', event.target.value)} required /></label>
            <label>{text.materialUnitCost}<input type="number" min="0" step="0.01" value={material.unitCost} onChange={(event) => update(setMaterial, 'unitCost', event.target.value)} required /></label>
          </div>
          {workOrder.pricingType === 'TIME_AND_MATERIALS' && <label>{text.materialCustomerCharge}<input type="number" min="0" step="0.01" value={material.customerCharge} onChange={(event) => update(setMaterial, 'customerCharge', event.target.value)} /></label>}
          <label>{text.materialPayer}
            <select value={material.payerType} onChange={(event) => update(setMaterial, 'payerType', event.target.value)}>
              <option value="OWNER">{text.owner}</option>
              <option value="EMPLOYEE">{text.employeePayer}</option>
              <option value="OTHER">{text.otherPayer}</option>
            </select>
          </label>
          {material.payerType === 'EMPLOYEE' && (
            <label>{text.employees}<select value={material.payerEmployeeId} onChange={(event) => update(setMaterial, 'payerEmployeeId', event.target.value)} required>
              <option value="">{text.selectParty}</option>
              {employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}
            </select></label>
          )}
          {material.payerType === 'OTHER' && <label>{text.payerDescription}<input value={material.payerDescription} onChange={(event) => update(setMaterial, 'payerDescription', event.target.value)} maxLength="160" required /></label>}
          <button className="secondary-button" type="submit">{text.addMaterial}</button>
        </form>
      </details>

      <details>
        <summary>{text.addAdjustment}</summary>
        <form className="auth-form actuals-form" onSubmit={(event) => {
          event.preventDefault();
          send('adjustments', 'POST', adjustment, () => setAdjustment({ ...adjustment, amountDelta: '0.00', reason: '', scopeChange: '' }));
        }}>
          <label>{text.adjustmentType}
            <select value={adjustment.type} onChange={(event) => update(setAdjustment, 'type', event.target.value)}>
              <option value="SCOPE_CHANGE">{text.scopeChange}</option>
              <option value="PRICE_CHANGE">{text.priceChange}</option>
              {workOrder.pricingType === 'TIME_AND_MATERIALS' && <option value="TIME_AND_MATERIALS_CHARGE">{text.timeAndMaterialsCharge}</option>}
            </select>
          </label>
          <label>{text.adjustmentAmount}<input type="number" step="0.01" value={adjustment.amountDelta} onChange={(event) => update(setAdjustment, 'amountDelta', event.target.value)} required /></label>
          {adjustment.type === 'SCOPE_CHANGE' && <label>{text.scopeChange}<textarea value={adjustment.scopeChange} onChange={(event) => update(setAdjustment, 'scopeChange', event.target.value)} maxLength="10000" rows="2" required /></label>}
          <label>{text.adjustmentReason}<textarea value={adjustment.reason} onChange={(event) => update(setAdjustment, 'reason', event.target.value)} maxLength="1000" rows="2" required /></label>
          <button className="secondary-button" type="submit">{text.addAdjustment}</button>
        </form>
      </details>

      {actuals.workLogs.length > 0 && <div className="actual-record-list">
        <h4>{text.workLogs}</h4>
        {actuals.workLogs.map((log) => (
          <div className={`actual-record${log.voidedAt ? ' voided-record' : ''}`} key={log.id}>
            <span>{formatDate(log.startedAt, timeZone, isSpanish)} – {formatDate(log.endedAt, timeZone, isSpanish)} · {log.durationMinutes} {text.durationMinutes}</span>
            {log.note && <span>{log.note}</span>}
            {log.voidedAt ? <span>{text.voided}: {log.voidReason}</span> : <button className="secondary-button" type="button" onClick={() => voidRecord('workLog', log.id)}>{text.voidRecord}</button>}
          </div>
        ))}
      </div>}

      {actuals.materials.length > 0 && <div className="actual-record-list">
        <h4>{text.materials}</h4>
        {actuals.materials.map((line) => (
          <div className={`actual-record${line.voidedAt ? ' voided-record' : ''}`} key={line.id}>
            <span>{line.quantity} × {line.description} · {text.actualCost}: ${line.actualCost}{line.customerCharge != null ? ` · ${text.customerCharge}: $${line.customerCharge}` : ''}</span>
            <span>{text.paidBy}: {line.payerType === 'EMPLOYEE' ? line.payerEmployee?.name : line.payerType === 'OTHER' ? line.payerDescription : text.owner}</span>
            {line.voidedAt ? <span>{text.voided}: {line.voidReason}</span> : <button className="secondary-button" type="button" onClick={() => voidRecord('material', line.id)}>{text.voidRecord}</button>}
          </div>
        ))}
      </div>}

      {actuals.adjustments.length > 0 && <div className="actual-record-list">
        <h4>{text.adjustments}</h4>
        {actuals.adjustments.map((item) => (
          <div className="actual-record" key={item.id}>
            <span>{text[item.type === 'SCOPE_CHANGE' ? 'scopeChange' : item.type === 'PRICE_CHANGE' ? 'priceChange' : 'timeAndMaterialsCharge']} · ${item.amountDelta}</span>
            {item.scopeChange && <span>{item.scopeChange}</span>}
            <span>{text.adjustmentReason}: {item.reason}</span>
          </div>
        ))}
      </div>}

      <section className="additional-work-panel">
        <h4>{text.additionalWork}</h4>
        <p className="form-footnote">{text.additionalWorkAuthorizationNotice}</p>
        {additionalWork.map((item) => (
          <article className="additional-work-card" key={item.id}>
            <div className="estimate-heading">
              <div><strong>{item.title} · {text[`additionalWork${item.status}`]}</strong><span>{item.description}</span></div>
              <strong>{text.estimatedAmount}: ${item.estimatedAmount}{item.approvedAmount != null ? ` · ${text.approvedAmount}: $${item.approvedAmount}` : ''}</strong>
            </div>
            <p className="form-footnote">{text.additionalWorkReason}: {item.reason}</p>
            {item.status === 'APPROVED' && <p className="form-footnote">{text.authorizationRecorded}: {item.authorizationMethod === 'PHONE' ? text.phoneAuthorization : text.inPersonAuthorization} · {item.authorizedByName} · {item.authorizationDetails}</p>}
            {item.status === 'PENDING_AUTHORIZATION' && (
              <div className="additional-work-decision">
                <label>{text.authorizationMethod}
                  <select value={approvalDrafts[item.id]?.authorizationMethod ?? 'IN_PERSON'} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], authorizationMethod: event.target.value } }))}>
                    <option value="IN_PERSON">{text.inPersonAuthorization}</option>
                    <option value="PHONE">{text.phoneAuthorization}</option>
                  </select>
                </label>
                <label>{text.authorizedByName}<input value={approvalDrafts[item.id]?.authorizedByName ?? ''} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], authorizedByName: event.target.value } }))} maxLength="160" /></label>
                <label>{text.authorizationDetails}<textarea value={approvalDrafts[item.id]?.authorizationDetails ?? ''} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], authorizationDetails: event.target.value } }))} maxLength="2000" rows="2" /></label>
                <label>{text.approvedAmount}<input type="number" min="0" step="0.01" value={approvalDrafts[item.id]?.approvedAmount ?? item.estimatedAmount} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], approvedAmount: event.target.value } }))} /></label>
                <label className="checkbox-label"><input type="checkbox" checked={approvalDrafts[item.id]?.confirmation === true} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], confirmation: event.target.checked } }))} /> {text.confirmCustomerAuthorization}</label>
                <div className="assignment-actions">
                  <button className="primary-link" type="button" disabled={!approvalDrafts[item.id]?.confirmation || !approvalDrafts[item.id]?.authorizedByName?.trim() || !approvalDrafts[item.id]?.authorizationDetails?.trim()} onClick={() => decideAdditionalWork(item, 'approve')}>{text.recordApproval}</button>
                  <button className="secondary-button" type="button" onClick={() => decideAdditionalWork(item, 'reject')}>{text.rejectAdditionalWork}</button>
                  <button className="secondary-button" type="button" onClick={() => decideAdditionalWork(item, 'cancel')}>{text.cancelAdditionalWork}</button>
                </div>
              </div>
            )}
            {item.events?.length > 1 && <details className="version-history"><summary>{text.authorizationHistory}</summary>{item.events.map((event) => <p key={event.id}>{text[`additionalWork${event.toStatus}`]} · {event.reason ?? event.authorizedByName ?? ''}</p>)}</details>}
          </article>
        ))}
        <form className="auth-form actuals-form" onSubmit={(event) => {
          event.preventDefault();
          sendAdditional('', 'POST', additionalDraft, () => setAdditionalDraft({ title: '', reason: '', description: '', estimatedAmount: '' }));
        }}>
          <label>{text.additionalWorkTitle}<input value={additionalDraft.title} onChange={(event) => update(setAdditionalDraft, 'title', event.target.value)} maxLength="200" required /></label>
          <label>{text.additionalWorkReason}<input value={additionalDraft.reason} onChange={(event) => update(setAdditionalDraft, 'reason', event.target.value)} maxLength="1000" required /></label>
          <label>{text.additionalWorkDescription}<textarea value={additionalDraft.description} onChange={(event) => update(setAdditionalDraft, 'description', event.target.value)} maxLength="10000" rows="2" required /></label>
          <label>{text.estimatedAmount}<input type="number" min="0" step="0.01" value={additionalDraft.estimatedAmount} onChange={(event) => update(setAdditionalDraft, 'estimatedAmount', event.target.value)} required /></label>
          <button className="secondary-button" type="submit">{text.requestAuthorization}</button>
        </form>
      </section>
      <WorkOrderMediaPanel workspaceId={workspaceId} workOrder={workOrder} text={text} />
    </section>
  );
}
