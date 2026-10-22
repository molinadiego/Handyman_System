import { useEffect, useState } from 'react';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

async function sendJson(url, method, data) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { response, body: await readResponse(response) };
}

function messageFor(body, text) {
  switch (body?.error?.code) {
    case 'AUTH_REQUIRED': return text.authRequired;
    case 'RESOURCE_NOT_FOUND': return text.workspaceNotFound;
    case 'INVALID_REQUEST_STATUS': return text.invalidRequestStatus;
    case 'INVALID_ESTIMATE_RECIPIENT': return text.invalidEstimateRecipient;
    case 'INVALID_ESTIMATE_PROPERTY': return text.propertyRequired;
    case 'INVALID_ESTIMATE_LINES': return text.lineRequired;
    case 'INVALID_ESTIMATE_RECIPIENTS': return text.recipientRequired;
    case 'TAX_RATE_REQUIRED': return text.taxRateRequired;
    case 'INCOMPLETE_ESTIMATE_PRICE': return text.estimatePriceRequired;
    case 'ESTIMATE_LOCKED': return text.estimateLocked;
    case 'EMAIL_PROVIDER_NOT_CONFIGURED': return text.emailNotConfigured;
    case 'ESTIMATE_LINK_INVALID': return text.estimateLinkInvalid;
    default:
      if (body?.error?.code?.startsWith('EMAIL_PROVIDER_HTTP_')) return text.emailDeliveryFailed;
      return text.genericError;
  }
}

function dateTodayLocal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function StatusMessage({ notice }) {
  if (!notice) return null;
  return <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>;
}

export function ServiceRequestsPage({ workspaceId, text }) {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [partyType, setPartyType] = useState('NONE');
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}`;

  async function refresh() {
    const [requestResponse, customerResponse, managerResponse, propertyResponse] = await Promise.all([
      fetch(`${base}/requests`),
      fetch(`${base}/customers`),
      fetch(`${base}/property-managers`),
      fetch(`${base}/properties`),
    ]);
    const [requestBody, customerBody, managerBody, propertyBody] = await Promise.all([
      readResponse(requestResponse), readResponse(customerResponse), readResponse(managerResponse), readResponse(propertyResponse),
    ]);
    for (const [response, body] of [[requestResponse, requestBody], [customerResponse, customerBody], [managerResponse, managerBody], [propertyResponse, propertyBody]]) {
      if (!response.ok) throw new Error(messageFor(body, text));
    }
    setRequests(requestBody.data ?? []);
    setCustomers(customerBody.data ?? []);
    setManagers(managerBody.data ?? []);
    setProperties(propertyBody.data ?? []);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workspaceId]);

  async function createRequest(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const fields = Object.fromEntries(new FormData(formElement).entries());
    const partyId = fields.partyId;
    const payload = {
      requesterName: fields.requesterName,
      requesterEmail: fields.requesterEmail || null,
      requesterPhone: fields.requesterPhone || null,
      description: fields.description,
      notes: fields.notes || null,
      propertyId: fields.propertyId || null,
      ...(partyType === 'CUSTOMER' && partyId ? { customerId: partyId } : {}),
      ...(partyType === 'MANAGER' && partyId ? { propertyManagerId: partyId } : {}),
    };
    const { response, body } = await sendJson(`${base}/requests`, 'POST', payload);
    if (!response.ok) {
      setNotice({ type: 'error', message: messageFor(body, text) });
      return;
    }
    formElement.reset();
    setPartyType('NONE');
    await refresh();
  }

  async function changeStatus(requestId, status) {
    const { response, body } = await sendJson(`${base}/requests/${encodeURIComponent(requestId)}/status`, 'PATCH', { status });
    if (!response.ok) {
      setNotice({ type: 'error', message: messageFor(body, text) });
      return;
    }
    await refresh();
  }

  const statusLabels = {
    RECEIVED: text.statusReceived,
    IN_REVIEW: text.statusInReview,
    ESTIMATED: text.statusEstimated,
    AGREED_DIRECTLY: text.statusAgreedDirect,
    NOT_ACCEPTED: text.statusNotAccepted,
    CLOSED: text.statusClosed,
  };

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.requests}</h1>
      <p className="form-footnote"><a href={`/workspaces/${encodeURIComponent(workspaceId)}`}>{text.backToWorkspaces}</a></p>
      <StatusMessage notice={notice} />
      <div className="crm-list">
        {requests.map((request) => (
          <article className="crm-row" key={request.id}>
            <div><strong>{request.requesterName}</strong><span>{request.description}</span></div>
            <select value={request.status} onChange={(event) => changeStatus(request.id, event.target.value)} aria-label={text.requestStatus}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </article>
        ))}
      </div>
      {requests.length === 0 && !notice && <p className="form-footnote">{text.noRecords}</p>}
      <form className="auth-form crm-form" onSubmit={createRequest}>
        <h2>{text.addRequest}</h2>
        <label>{text.requestName}<input name="requesterName" maxLength="160" required /></label>
        <div className="form-grid">
          <label>{text.email}<input name="requesterEmail" type="email" maxLength="254" /></label>
          <label>{text.phone}<input name="requesterPhone" type="tel" maxLength="40" /></label>
        </div>
        <label>{text.requestDescription}<textarea name="description" rows="3" maxLength="10000" required /></label>
        <label>{text.properties}
          <select name="propertyId" defaultValue="">
            <option value="">{text.none}</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.addressLine1}, {property.city}</option>)}
          </select>
        </label>
        <label>{text.requestBillTo}
          <select value={partyType} onChange={(event) => setPartyType(event.target.value)}>
            <option value="NONE">{text.none}</option>
            <option value="CUSTOMER">{text.customers}</option>
            <option value="MANAGER">{text.propertyManagers}</option>
          </select>
        </label>
        {partyType !== 'NONE' && (
          <label>{partyType === 'CUSTOMER' ? text.customers : text.propertyManagers}
            <select name="partyId" required defaultValue="">
              <option value="" disabled>{text.selectParty}</option>
              {(partyType === 'CUSTOMER' ? customers : managers).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </label>
        )}
        <label>{text.notes}<textarea name="notes" rows="2" maxLength="10000" /></label>
        <button className="primary-link" type="submit">{text.addRequest}</button>
      </form>
    </section>
  );
}

export function EstimatesPage({ workspaceId, text }) {
  const [estimates, setEstimates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [recipientType, setRecipientType] = useState('CUSTOMER');
  const [recipientId, setRecipientId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [scope, setScope] = useState('');
  const [taxable, setTaxable] = useState(false);
  const [taxRate, setTaxRate] = useState('');
  const [discountType, setDiscountType] = useState('NONE');
  const [discountValue, setDiscountValue] = useState('');
  const [lines, setLines] = useState([{ description: '', quantity: '1', unitPrice: '' }]);
  const [editingId, setEditingId] = useState(null);
  const [recipientInputs, setRecipientInputs] = useState({});
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });
  const [busy, setBusy] = useState(false);
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}`;
  const recipientOptions = recipientType === 'CUSTOMER' ? customers : managers;

  async function getData(url) {
    const response = await fetch(url);
    const body = await readResponse(response);
    if (!response.ok) throw new Error(messageFor(body, text));
    return body.data ?? [];
  }

  async function refresh() {
    const [estimateData, requestData, customerData, managerData, propertyData] = await Promise.all([
      getData(`${base}/estimates`),
      getData(`${base}/requests`),
      getData(`${base}/customers`),
      getData(`${base}/property-managers`),
      getData(`${base}/properties`),
    ]);
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

  function startEdit(estimate) {
    const version = estimate.versions?.[0];
    if (!version) return;
    setEditingId(estimate.id);
    setRecipientType(estimate.customerId ? 'CUSTOMER' : 'MANAGER');
    setRecipientId(estimate.customerId ?? estimate.propertyManagerId ?? '');
    setPropertyId(estimate.propertyId);
    setRequestId(estimate.serviceRequestId ?? '');
    setScope(version.scopeSnapshot);
    setTaxable(version.taxable);
    setTaxRate(version.taxRateOverride?.toString() ?? '');
    setDiscountType(version.discountType ?? 'NONE');
    setDiscountValue(version.discountValue?.toString() ?? '');
    setLines(version.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity.toString(),
      unitPrice: line.unitPrice?.toString() ?? '',
    })));
    setNotice(null);
  }

  function clearDraft() {
    setEditingId(null);
    setRecipientType('CUSTOMER');
    setRecipientId('');
    setPropertyId('');
    setRequestId('');
    setScope('');
    setTaxable(false);
    setTaxRate('');
    setDiscountType('NONE');
    setDiscountValue('');
    setLines([{ description: '', quantity: '1', unitPrice: '' }]);
  }

  async function saveDraft(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const payload = {
      ...(recipientType === 'CUSTOMER' ? { customerId: recipientId } : { propertyManagerId: recipientId }),
      propertyId,
      serviceRequestId: requestId || null,
      scope,
      taxable,
      taxRate: taxRate || null,
      discountType: discountType === 'NONE' ? null : discountType,
      discountValue: discountType === 'NONE' ? null : discountValue || null,
      lines,
    };
    try {
      const url = editingId ? `${base}/estimates/${encodeURIComponent(editingId)}` : `${base}/estimates`;
      const { response, body } = await sendJson(url, editingId ? 'PATCH' : 'POST', payload);
      if (!response.ok) throw new Error(messageFor(body, text));
      clearDraft();
      await refresh();
      setNotice({ type: 'success', message: text.estimateSaved });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(estimateId) {
    const response = await fetch(`${base}/estimates/${encodeURIComponent(estimateId)}/pdf`);
    if (!response.ok) {
      const body = await readResponse(response);
      setNotice({ type: 'error', message: messageFor(body, text) });
      return;
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `estimate-${estimateId}.pdf`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function sendEstimate(estimateId) {
    const recipients = (recipientInputs[estimateId] ?? '').split(',').map((email) => email.trim()).filter(Boolean);
    const { response, body } = await sendJson(`${base}/estimates/${encodeURIComponent(estimateId)}/send`, 'POST', { recipients });
    if (!response.ok) {
      setNotice({ type: 'error', message: messageFor(body, text) });
      return;
    }
    setNotice({
      type: body.data.failedCount ? 'error' : 'success',
      message: text.estimateSendSummary.replace('{sent}', body.data.sentCount).replace('{failed}', body.data.failedCount),
    });
    await refresh();
  }

  function updateLine(index, field, value) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  }

  const statusLabels = {
    DRAFT: text.estimateDraft,
    SENT: text.estimateSent,
    ACCEPTED: text.estimateAcceptedStatus,
    REJECTED: text.estimateRejected,
    EXPIRED: text.estimateExpired,
  };

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.estimates}</h1>
      <p className="form-footnote"><a href={`/workspaces/${encodeURIComponent(workspaceId)}`}>{text.backToWorkspaces}</a></p>
      <StatusMessage notice={notice} />
      <div className="crm-list">
        {estimates.map((estimate) => {
          const version = estimate.versions?.[0];
          const recipient = estimate.customer?.companyName || estimate.customer?.name
            || estimate.propertyManager?.companyName || estimate.propertyManager?.name || '';
          return (
            <article className="estimate-card" key={estimate.id}>
              <div className="estimate-heading">
                <div><strong>PRE-{estimate.number}</strong><span>{statusLabels[estimate.status] ?? estimate.status} · {recipient}</span></div>
                {version?.total && <strong>{new Intl.NumberFormat(text.acceptEstimate === 'Aceptar presupuesto' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(Number(version.total))}</strong>}
              </div>
              <div className="estimate-actions">
                <button className="secondary-button" type="button" onClick={() => startEdit(estimate)}>{text.editEstimate}</button>
                <button className="secondary-button" type="button" onClick={() => downloadPdf(estimate.id)}>{text.downloadPdf}</button>
              </div>
              <label className="recipient-input">{text.emailRecipients}
                <input
                  value={recipientInputs[estimate.id] ?? version?.recipientEmailSnapshot ?? ''}
                  onChange={(event) => setRecipientInputs((current) => ({ ...current, [estimate.id]: event.target.value }))}
                  placeholder="customer@example.com"
                />
              </label>
              <button className="primary-link" type="button" onClick={() => sendEstimate(estimate.id)}>{text.sendEstimate}</button>
              {estimate.versions?.length > 1 && (
                <details className="version-history">
                  <summary>{text.versionHistory}</summary>
                  {estimate.versions.map((item) => (
                    <p key={item.id}>{text.versionLabel} {item.versionNumber} · {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : text.estimateDraft}</p>
                  ))}
                </details>
              )}
            </article>
          );
        })}
      </div>
      {estimates.length === 0 && !notice && <p className="form-footnote">{text.noRecords}</p>}

      <form className="auth-form crm-form" onSubmit={saveDraft}>
        <h2>{editingId ? text.editEstimate : text.addEstimate}</h2>
        <label>{text.estimateRecipientType}
          <select value={recipientType} onChange={(event) => { setRecipientType(event.target.value); setRecipientId(''); }}>
            <option value="CUSTOMER">{text.customers}</option>
            <option value="MANAGER">{text.propertyManagers}</option>
          </select>
        </label>
        <label>{recipientType === 'CUSTOMER' ? text.customers : text.propertyManagers}
          <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required>
            <option value="">{text.selectParty}</option>
            {recipientOptions.map((party) => <option key={party.id} value={party.id}>{party.companyName || party.name}</option>)}
          </select>
        </label>
        <label>{text.properties}
          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required>
            <option value="">{text.selectProperty}</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.addressLine1}, {property.city}</option>)}
          </select>
        </label>
        <label>{text.linkedRequest}
          <select value={requestId} onChange={(event) => setRequestId(event.target.value)}>
            <option value="">{text.none}</option>
            {requests.map((request) => <option key={request.id} value={request.id}>{request.requesterName}: {request.description.slice(0, 70)}</option>)}
          </select>
        </label>
        <label>{text.estimateScope}<textarea value={scope} onChange={(event) => setScope(event.target.value)} rows="3" maxLength="10000" required /></label>
        <div className="line-item-heading"><h3>{text.lineItems}</h3><button className="secondary-button" type="button" onClick={() => setLines((current) => [...current, { description: '', quantity: '1', unitPrice: '' }])}>{text.addLine}</button></div>
        {lines.map((line, index) => (
          <div className="estimate-line-form" key={`${editingId ?? 'new'}-${index}`}>
            <label>{text.lineDescription}<input value={line.description} onChange={(event) => updateLine(index, 'description', event.target.value)} maxLength="500" required /></label>
            <div className="form-grid">
              <label>{text.quantity}<input type="number" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} min="0.01" step="0.01" required /></label>
              <label>{text.unitPrice}<input type="number" value={line.unitPrice} onChange={(event) => updateLine(index, 'unitPrice', event.target.value)} min="0" step="0.01" /></label>
            </div>
            {lines.length > 1 && <button className="secondary-button" type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>{text.removeLine}</button>}
          </div>
        ))}
        <label className="checkbox-label"><input type="checkbox" checked={taxable} onChange={(event) => setTaxable(event.target.checked)} /> {text.taxable}</label>
        {taxable && <label>{text.taxRate}<input type="number" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} min="0" max="100" step="0.0001" /></label>}
        <label>{text.discountType}
          <select value={discountType} onChange={(event) => setDiscountType(event.target.value)}>
            <option value="NONE">{text.noDiscount}</option>
            <option value="FIXED_AMOUNT">{text.fixedDiscount}</option>
            <option value="PERCENTAGE">{text.percentageDiscount}</option>
          </select>
        </label>
        {discountType !== 'NONE' && <label>{text.discountValue}<input type="number" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} min="0" step="0.01" required /></label>}
        <div className="form-actions">
          <button className="primary-link" type="submit">{text.saveDraft}</button>
          {editingId && <button className="secondary-button" type="button" onClick={clearDraft}>{text.cancelEdit}</button>}
        </div>
      </form>
    </section>
  );
}

export function EstimateAcceptancePage({ text }) {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.history.replaceState({}, document.title, '/estimates/accept'); }, []);

  async function accept() {
    if (!token) {
      setNotice({ type: 'error', message: text.estimateLinkInvalid });
      return;
    }
    setBusy(true);
    try {
      const { response, body } = await sendJson('/api/public/estimates/accept', 'POST', { token });
      if (!response.ok) throw new Error(messageFor(body, text));
      setNotice({
        type: 'success',
        message: text.estimateAcceptedWithNumber.replace('{number}', `PRE-${body.data.estimateNumber}`),
      });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.estimateLinkInvalid });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.estimateLinkTitle}</h1>
      <p className="description">{text.estimateAcceptanceInstructions}</p>
      <StatusMessage notice={notice} />
      {!notice?.type || notice.type === 'error'
        ? <button className="primary-link" type="button" onClick={accept} disabled={busy}>{busy ? text.saving : text.acceptEstimate}</button>
        : null}
    </section>
  );
}
