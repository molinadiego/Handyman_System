import React, { useEffect, useRef, useState } from 'react';

const copy = {
  en: {
    eyebrow: 'Your business, in good order',
    title: 'Less juggling. More hands-on work.',
    description: 'A clear home for your customers, jobs, schedule, estimates and payments.',
    status: 'Project foundation',
    ready: 'Ready to build',
    language: 'Español',
    next: 'The workspace for your day-to-day work is taking shape.',
    footer: 'Built for the work that keeps things working.',
    signIn: 'Sign in',
    createAccount: 'Create account',
    registerTitle: 'Create your owner account',
    loginTitle: 'Welcome back',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    register: 'Register',
    login: 'Sign in',
    forgotPassword: 'Forgot password?',
    sendReset: 'Send reset link',
    updatePassword: 'Update password',
    verifyTitle: 'Verify your email',
    verifying: 'Verifying your email…',
    verified: 'Your email is verified. You can sign in now.',
    resetTitle: 'Reset your password',
    workspaceTitle: 'Your workspaces',
    settings: 'Settings',
    languageSetting: 'Interface language',
    saveSettings: 'Save settings',
    saving: 'Saving…',
    settingsSaved: 'Language preference saved.',
    languageSaveFailed: 'Could not save the language preference.',
    english: 'English',
    spanish: 'Spanish',
    openWorkspace: 'Open workspace',
    backToWorkspaces: 'Back to workspaces',
    workspaceDetail: 'Workspace is ready. Customer and property management is the next module.',
    workspaceName: 'Business name',
    timeZone: 'IANA time zone (for example, America/Chicago)',
    createWorkspace: 'Create workspace',
    signOut: 'Sign out',
    backToLogin: 'Back to sign in',
    passwordMismatch: 'Passwords do not match.',
    accountRequestSent: 'If the account can receive this email, instructions will be sent.',
    requestSubmitted: 'If the account can receive this email, instructions will be sent.',
    resetComplete: 'Password updated. You can sign in again.',
    genericError: 'Something went wrong. Please try again.',
    invalidLink: 'This link is invalid or expired. Request a new one.',
    missingToken: 'This link is missing its token. Request a new one.',
    loadingWorkspaces: 'Loading workspaces…',
    noWorkspaces: 'You do not have a workspace yet.',
    emailNotConfigured: 'Email delivery is not configured yet.',
    emailDeliveryFailed: 'The email could not be sent. Check the sender configuration.',
    invalidCredentials: 'Email or password is incorrect.',
    authRequired: 'Please sign in to continue.',
    workspaceNotFound: 'Workspace was not found.',
    invalidEmail: 'Enter a valid email address.',
    invalidPassword: 'Password must be 12–128 characters.',
    invalidTimeZone: 'Enter a valid IANA time zone.',
    invalidWorkspaceName: 'Workspace name must be 2–160 characters.',
  },
  es: {
    eyebrow: 'Tu negocio, en orden',
    title: 'Menos vueltas. Más trabajo hecho.',
    description: 'Un lugar claro para tus clientes, trabajos, agenda, presupuestos y cobros.',
    status: 'Base del proyecto',
    ready: 'Listo para construir',
    language: 'English',
    next: 'Estamos preparando el espacio para organizar tu trabajo diario.',
    footer: 'Hecho para quienes mantienen todo en funcionamiento.',
    signIn: 'Iniciar sesión',
    createAccount: 'Crear cuenta',
    registerTitle: 'Crea tu cuenta de dueño',
    loginTitle: 'Bienvenido de nuevo',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirma la contraseña',
    register: 'Registrarme',
    login: 'Iniciar sesión',
    forgotPassword: '¿Olvidaste tu contraseña?',
    sendReset: 'Enviar enlace de recuperación',
    updatePassword: 'Actualizar contraseña',
    verifyTitle: 'Verifica tu correo',
    verifying: 'Verificando tu correo…',
    verified: 'Tu correo está verificado. Ya puedes iniciar sesión.',
    resetTitle: 'Restablece tu contraseña',
    workspaceTitle: 'Tus espacios de trabajo',
    settings: 'Configuración',
    languageSetting: 'Idioma de la interfaz',
    saveSettings: 'Guardar configuración',
    saving: 'Guardando…',
    settingsSaved: 'Se guardó la preferencia de idioma.',
    languageSaveFailed: 'No se pudo guardar el idioma.',
    english: 'Inglés',
    spanish: 'Español',
    openWorkspace: 'Abrir espacio',
    backToWorkspaces: 'Volver a espacios',
    workspaceDetail: 'El espacio está listo. La gestión de clientes y propiedades será el siguiente módulo.',
    workspaceName: 'Nombre del negocio',
    timeZone: 'Zona horaria IANA (por ejemplo, America/Chicago)',
    createWorkspace: 'Crear espacio de trabajo',
    signOut: 'Cerrar sesión',
    backToLogin: 'Volver a iniciar sesión',
    passwordMismatch: 'Las contraseñas no coinciden.',
    accountRequestSent: 'Si la cuenta puede recibir este correo, enviaremos instrucciones.',
    requestSubmitted: 'Si la cuenta puede recibir este correo, enviaremos instrucciones.',
    resetComplete: 'Contraseña actualizada. Ya puedes iniciar sesión.',
    genericError: 'Ocurrió un error. Inténtalo de nuevo.',
    invalidLink: 'El enlace no es válido o venció. Solicita uno nuevo.',
    missingToken: 'Falta el token del enlace. Solicita uno nuevo.',
    loadingWorkspaces: 'Cargando espacios de trabajo…',
    noWorkspaces: 'Todavía no tienes un espacio de trabajo.',
    emailNotConfigured: 'El envío de correos todavía no está configurado.',
    emailDeliveryFailed: 'No se pudo enviar el correo. Revisa la configuración del remitente.',
    invalidCredentials: 'El correo o la contraseña no son correctos.',
    authRequired: 'Inicia sesión para continuar.',
    workspaceNotFound: 'No se encontró el espacio de trabajo.',
    invalidEmail: 'Ingresa un correo electrónico válido.',
    invalidPassword: 'La contraseña debe tener entre 12 y 128 caracteres.',
    invalidTimeZone: 'Ingresa una zona horaria IANA válida.',
    invalidWorkspaceName: 'El nombre del negocio debe tener entre 2 y 160 caracteres.',
  },
};

async function postJson(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function patchJson(url, data) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function detectInitialLanguage() {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('handy-language');
    if (saved === 'en' || saved === 'es') return saved;
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function apiError(body, text) {
  switch (body?.error?.code) {
    case 'EMAIL_PROVIDER_NOT_CONFIGURED':
      return text.emailNotConfigured;
    case 'EMAIL_DELIVERY_FAILED':
    case 'EMAIL_PROVIDER_UNREACHABLE':
      return text.emailDeliveryFailed;
    case 'INVALID_CREDENTIALS':
      return text.invalidCredentials;
    case 'AUTH_REQUIRED':
      return text.authRequired;
    case 'WORKSPACE_NOT_FOUND':
      return text.workspaceNotFound;
    case 'INVALID_EMAIL':
      return text.invalidEmail;
    case 'INVALID_PASSWORD':
      return text.invalidPassword;
    case 'INVALID_TIME_ZONE':
      return text.invalidTimeZone;
    case 'INVALID_WORKSPACE_NAME':
      return text.invalidWorkspaceName;
    case 'INVALID_OR_EXPIRED_TOKEN':
      return text.invalidLink;
    default:
      if (body?.error?.code?.startsWith('EMAIL_PROVIDER_HTTP_')) return text.emailDeliveryFailed;
      return text.genericError;
  }
}

function Shell({ text, language, setLanguage, isOwner, children }) {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Handy System home">
          <img src="/favicon.svg" alt="" width="38" height="38" />
          <span>Handy System</span>
        </a>
        {isOwner ? (
          <a className="secondary-link topbar-settings" href="/settings">{text.settings}</a>
        ) : (
          <button
            className="language-button"
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            aria-label={`Switch language to ${text.language}`}
          >
            {text.language}
          </button>
        )}
      </header>
      {children}
      <footer className="footer">{text.footer}</footer>
    </main>
  );
}

function Notice({ notice }) {
  if (!notice) return null;
  return <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>;
}

function Landing({ text }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1 id="hero-title">{text.title}</h1>
        <p className="description">{text.description}</p>
        <div className="landing-actions">
          <a className="primary-link" href="/register">{text.createAccount}</a>
          <a className="secondary-link" href="/login">{text.signIn}</a>
        </div>
        <div className="status-card" role="status">
          <span className="status-dot" />
          <span>{text.status}</span>
          <strong>{text.ready}</strong>
        </div>
      </div>

      <aside className="preview-card" aria-label={text.status}>
        <div className="preview-heading">
          <span className="preview-icon">HS</span>
          <span className="preview-label">HANDY SYSTEM</span>
        </div>
        <div className="preview-lines" aria-hidden="true"><span /><span /><span /></div>
        <p>{text.next}</p>
      </aside>
    </section>
  );
}

function RegisterPage({ text, language }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData(formElement);
      const { response, body } = await postJson('/api/auth/register', {
        email: form.get('email'),
        password: form.get('password'),
        preferredLanguage: language,
      });
      if (!response.ok) throw new Error(apiError(body, text));
      setNotice({ type: 'success', message: text.accountRequestSent });
      formElement.reset();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={text.registerTitle} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.email}<input name="email" type="email" autoComplete="email" required /></label>
        <label>{text.password}<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
        <button className="primary-link" type="submit" disabled={busy}>{busy ? '…' : text.register}</button>
      </form>
      <p className="form-footnote"><a href="/login">{text.signIn}</a></p>
    </AuthCard>
  );
}

function LoginPage({ text }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData(event.currentTarget);
      const { response, body } = await postJson('/api/auth/login', {
        email: form.get('email'),
        password: form.get('password'),
      });
      if (!response.ok) throw new Error(apiError(body, text));
      if (body.data.preferredLanguage === 'en' || body.data.preferredLanguage === 'es') {
        window.localStorage.setItem('handy-language', body.data.preferredLanguage);
      }
      window.location.assign('/workspaces');
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={text.loginTitle} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.email}<input name="email" type="email" autoComplete="email" required /></label>
        <label>{text.password}<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary-link" type="submit" disabled={busy}>{busy ? '…' : text.login}</button>
      </form>
      <p className="form-footnote"><a href="/forgot-password">{text.forgotPassword}</a></p>
    </AuthCard>
  );
}

function ForgotPasswordPage({ text }) {
  const [notice, setNotice] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setNotice(null);
    try {
      const form = new FormData(event.currentTarget);
      const { response, body } = await postJson('/api/auth/password-reset/request', {
        email: form.get('email'),
      });
      if (!response.ok) throw new Error(apiError(body, text));
      setNotice({ type: 'success', message: text.requestSubmitted });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    }
  }

  return (
    <AuthCard title={text.forgotPassword} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.email}<input name="email" type="email" autoComplete="email" required /></label>
        <button className="primary-link" type="submit">{text.sendReset}</button>
      </form>
      <p className="form-footnote"><a href="/login">{text.backToLogin}</a></p>
    </AuthCard>
  );
}

function VerifyEmailPage({ text }) {
  const started = useRef(false);
  const [notice, setNotice] = useState({ type: 'pending', message: text.verifying });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    window.history.replaceState({}, document.title, '/verify-email');

    if (!token) {
      setNotice({ type: 'error', message: text.missingToken });
      return;
    }

    postJson('/api/auth/verify-email', { token })
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(apiError(body, text));
        setNotice({ type: 'success', message: text.verified });
      })
      .catch((error) => setNotice({ type: 'error', message: error.message || text.invalidLink }));
  }, [text]);

  return (
    <AuthCard title={text.verifyTitle} text={text} notice={notice}>
      {notice.type === 'success' && <a className="primary-link" href="/login">{text.signIn}</a>}
    </AuthCard>
  );
}

function ResetPasswordPage({ text }) {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    window.history.replaceState({}, document.title, '/reset-password');
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!token) {
      setNotice({ type: 'error', message: text.missingToken });
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = form.get('password');
    if (password !== form.get('confirmPassword')) {
      setNotice({ type: 'error', message: text.passwordMismatch });
      return;
    }

    try {
      const { response, body } = await postJson('/api/auth/password-reset/complete', { token, password });
      if (!response.ok) throw new Error(apiError(body, text));
      setNotice({ type: 'success', message: text.resetComplete });
      formElement.reset();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.invalidLink });
    }
  }

  return (
    <AuthCard title={text.resetTitle} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.password}<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
        <label>{text.confirmPassword}<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
        <button className="primary-link" type="submit">{text.updatePassword}</button>
      </form>
      {notice?.type === 'success' && <p className="form-footnote"><a href="/login">{text.signIn}</a></p>}
    </AuthCard>
  );
}

function WorkspacesPage({ text }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });

  async function refresh() {
    const response = await fetch('/api/workspaces');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiError(body, text));
    setWorkspaces(body.data ?? []);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, []);

  async function createWorkspace(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { response, body } = await postJson('/api/workspaces', {
      name: form.get('name'),
      timeZone: form.get('timeZone'),
    });
    if (!response.ok) {
      setNotice({ type: 'error', message: apiError(body, text) });
      return;
    }
    formElement.reset();
    await refresh();
  }

  async function signOut() {
    await postJson('/api/auth/logout', {});
    window.location.assign('/login');
  }

  return (
    <section className="auth-card workspace-card">
      <div className="workspace-heading">
        <h1>{text.workspaceTitle}</h1>
        <button className="secondary-button" type="button" onClick={signOut}>{text.signOut}</button>
      </div>
      <Notice notice={notice} />
      {workspaces.map((workspace) => (
        <article className="workspace-row" key={workspace.id}>
          <div className="workspace-summary">
            <strong>{workspace.name}</strong><span>{workspace.timeZone}</span>
          </div>
          <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}`}>{text.openWorkspace}</a>
        </article>
      ))}
      {workspaces.length === 0 && !notice && <p className="form-footnote">{text.noWorkspaces}</p>}
      <form className="auth-form workspace-form" onSubmit={createWorkspace}>
        <label>{text.workspaceName}<input name="name" minLength="2" maxLength="160" required /></label>
        <label>{text.timeZone}<input name="timeZone" placeholder="America/Chicago" maxLength="64" required /></label>
        <button className="primary-link" type="submit">{text.createWorkspace}</button>
      </form>
    </section>
  );
}

function WorkspaceDetailPage({ text, workspaceId }) {
  const [workspace, setWorkspace] = useState(null);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });

  useEffect(() => {
    let active = true;
    fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiError(body, text));
        return body.data;
      })
      .then((data) => {
        if (!active) return;
        setWorkspace(data);
        setNotice(null);
      })
      .catch((error) => {
        if (active) setNotice({ type: 'error', message: error.message || text.genericError });
      });

    return () => { active = false; };
  }, [workspaceId, text]);

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      {notice && <Notice notice={notice} />}
      {workspace && (
        <>
          <h1 className="auth-title">{workspace.name}</h1>
          <p className="workspace-time-zone">{workspace.timeZone}</p>
          <p className="description workspace-description">{text.workspaceDetail}</p>
          <a className="secondary-link" href="/workspaces">{text.backToWorkspaces}</a>
        </>
      )}
    </section>
  );
}

function SettingsPage({ text, language, onLanguageSaved }) {
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSelectedLanguage(language), [language]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { response, body } = await patchJson('/api/auth/preferences/language', {
        preferredLanguage: selectedLanguage,
      });
      if (!response.ok) throw new Error(apiError(body, text));
      onLanguageSaved(body.data.preferredLanguage);
      setNotice({ type: 'success', message: text.settingsSaved });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.languageSaveFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={text.settings} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="preferred-language">{text.languageSetting}</label>
        <select
          id="preferred-language"
          value={selectedLanguage}
          onChange={(event) => setSelectedLanguage(event.target.value)}
        >
          <option value="en">{text.english}</option>
          <option value="es">{text.spanish}</option>
        </select>
        <button className="primary-link" type="submit" disabled={busy}>
          {busy ? text.saving : text.saveSettings}
        </button>
      </form>
      <p className="form-footnote"><a href="/workspaces">{text.backToWorkspaces}</a></p>
    </AuthCard>
  );
}

function AuthCard({ title, text, notice, children }) {
  return (
    <section className="auth-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{title}</h1>
      <Notice notice={notice} />
      {children}
    </section>
  );
}

export function App() {
  const [language, setLanguage] = useState(detectInitialLanguage);
  const [account, setAccount] = useState(null);
  const text = copy[language];
  const route = window.location.pathname.replace(/\/+$/u, '') || '/';
  const workspaceMatch = route.match(/^\/workspaces\/([^/]+)$/u);
  const needsOwnerSession = route === '/workspaces' || route === '/settings' || Boolean(workspaceMatch);

  useEffect(() => {
    if (!needsOwnerSession) {
      setAccount(null);
      return undefined;
    }

    let active = true;
    fetch('/api/auth/session')
      .then(async (response) => {
        if (!response.ok) throw new Error('Session unavailable');
        return response.json();
      })
      .then(({ data }) => {
        if (!active) return;
        setAccount(data);
        if (data.preferredLanguage === 'en' || data.preferredLanguage === 'es') {
          setLanguage(data.preferredLanguage);
          window.localStorage.setItem('handy-language', data.preferredLanguage);
        }
      })
      .catch(() => {
        if (active) setAccount(null);
      });

    return () => { active = false; };
  }, [route, needsOwnerSession]);

  function updateLocalLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setAccount((current) => current ? { ...current, preferredLanguage: nextLanguage } : current);
    window.localStorage.setItem('handy-language', nextLanguage);
  }

  let page;
  switch (route) {
    case '/register': page = <RegisterPage text={text} language={language} />; break;
    case '/login': page = <LoginPage text={text} />; break;
    case '/verify-email': page = <VerifyEmailPage text={text} />; break;
    case '/forgot-password': page = <ForgotPasswordPage text={text} />; break;
    case '/reset-password': page = <ResetPasswordPage text={text} />; break;
    case '/workspaces': page = <WorkspacesPage text={text} />; break;
    case '/settings': page = <SettingsPage text={text} language={account?.preferredLanguage ?? language} onLanguageSaved={updateLocalLanguage} />; break;
    default:
      page = workspaceMatch
        ? <WorkspaceDetailPage text={text} workspaceId={decodeURIComponent(workspaceMatch[1])} />
        : <Landing text={text} />;
  }

  return <Shell text={text} language={language} setLanguage={updateLocalLanguage} isOwner={Boolean(account)}>{page}</Shell>;
}
