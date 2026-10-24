import { useEffect, useState } from 'react';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function errorMessage(body, text) {
  switch (body?.error?.code) {
    case 'INVALID_EMPLOYEE_EMAIL': return text.invalidEmail;
    case 'RESOURCE_NOT_FOUND': return text.workspaceNotFound;
    default: return text.genericError;
  }
}

const blankEmployee = {
  name: '',
  email: '',
  phone: '',
  calendarColor: '#357A68',
  canUpdateProgress: true,
  canAddNotes: true,
  canUploadPhotos: false,
  canUploadVideos: false,
  isActive: true,
};

function PermissionFields({ value, onChange, text }) {
  return (
    <div className="employee-permissions">
      {[
        ['canUpdateProgress', text.canUpdateProgress],
        ['canAddNotes', text.canAddNotes],
        ['canUploadPhotos', text.canUploadPhotos],
        ['canUploadVideos', text.canUploadVideos],
        ['isActive', text.employeeActive],
      ].map(([field, label]) => (
        <label className="checkbox-label" key={field}>
          <input type="checkbox" checked={Boolean(value[field])} onChange={(event) => onChange(field, event.target.checked)} />
          {label}
        </label>
      ))}
    </div>
  );
}

export function EmployeePage({ workspaceId, text }) {
  const endpoint = `/api/workspaces/${encodeURIComponent(workspaceId)}/employees`;
  const [employees, setEmployees] = useState([]);
  const [draft, setDraft] = useState(blankEmployee);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });
  const [busyId, setBusyId] = useState(null);

  async function refresh() {
    const response = await fetch(endpoint);
    const body = await readResponse(response);
    if (!response.ok) throw new Error(errorMessage(body, text));
    setEmployees(body.data ?? []);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workspaceId]);

  async function save(url, method, value, formElement) {
    setBusyId(value.id ?? 'new');
    setNotice(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...value,
          email: value.email || null,
          phone: value.phone || null,
          calendarColor: value.calendarColor || null,
        }),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(body, text));
      if (formElement) {
        formElement.reset();
        setDraft(blankEmployee);
      }
      await refresh();
      setNotice({ type: 'success', message: text.employeeSaved });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusyId(null);
    }
  }

  function updateValue(setter, field, value) {
    setter((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{text.employees}</h1>
      <p className="form-footnote"><a href={`/workspaces/${encodeURIComponent(workspaceId)}`}>{text.backToWorkspaces}</a></p>
      {notice && <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>}

      <div className="crm-list">
        {employees.map((employee) => (
          <form
            className="employee-card"
            key={employee.id}
            onSubmit={(event) => {
              event.preventDefault();
              const input = Object.fromEntries(new FormData(event.currentTarget).entries());
              save(`${endpoint}/${encodeURIComponent(employee.id)}`, 'PATCH', {
                ...employee,
                name: input.name,
                email: input.email,
                phone: input.phone,
                calendarColor: input.calendarColor,
              }, null);
            }}
          >
            <div className="form-grid">
              <label>{text.name}<input name="name" defaultValue={employee.name} maxLength="160" required /></label>
              <label>{text.email}<input name="email" type="email" defaultValue={employee.email ?? ''} maxLength="254" /></label>
              <label>{text.phone}<input name="phone" type="tel" defaultValue={employee.phone ?? ''} maxLength="40" /></label>
              <label>{text.calendarColor}<input name="calendarColor" type="color" defaultValue={employee.calendarColor ?? '#357A68'} /></label>
            </div>
            <PermissionFields
              value={employee}
              text={text}
              onChange={(field, value) => {
                if (field === 'isActive' && !value && !window.confirm(text.offlineRevocationWarning)) return;
                const next = { ...employee, [field]: value };
                save(`${endpoint}/${encodeURIComponent(employee.id)}`, 'PATCH', next, null);
              }}
            />
            {employee.email && <p className="form-footnote">{text.employeeEmailChangeRevokes}</p>}
            <button className="secondary-button" type="submit" disabled={busyId === employee.id}>{text.updateRecord}</button>
          </form>
        ))}
      </div>
      {employees.length === 0 && !notice && <p className="form-footnote">{text.noRecords}</p>}

      <form
        className="auth-form crm-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          save(endpoint, 'POST', draft, form);
        }}
      >
        <h2>{text.addEmployee}</h2>
        <div className="form-grid">
          <label>{text.name}<input value={draft.name} onChange={(event) => updateValue(setDraft, 'name', event.target.value)} maxLength="160" required /></label>
          <label>{text.email}<input type="email" value={draft.email} onChange={(event) => updateValue(setDraft, 'email', event.target.value)} maxLength="254" /></label>
          <label>{text.phone}<input type="tel" value={draft.phone} onChange={(event) => updateValue(setDraft, 'phone', event.target.value)} maxLength="40" /></label>
          <label>{text.calendarColor}<input type="color" value={draft.calendarColor} onChange={(event) => updateValue(setDraft, 'calendarColor', event.target.value)} /></label>
        </div>
        <PermissionFields value={draft} text={text} onChange={(field, value) => updateValue(setDraft, field, value)} />
        <p className="form-footnote">{text.employeeCodeEmailRequirement}</p>
        <button className="primary-link" type="submit" disabled={busyId === 'new'}>{text.addEmployee}</button>
      </form>
    </section>
  );
}
