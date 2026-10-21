import { useState } from 'react';

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
  },
};

export function App() {
  const [language, setLanguage] = useState('en');
  const text = copy[language];

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Handy System home">
          <img src="/favicon.svg" alt="" width="38" height="38" />
          <span>Handy System</span>
        </a>
        <button
          className="language-button"
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          aria-label={`Switch language to ${text.language}`}
        >
          {text.language}
        </button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 id="hero-title">{text.title}</h1>
          <p className="description">{text.description}</p>
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
          <div className="preview-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>{text.next}</p>
        </aside>
      </section>

      <footer className="footer">{text.footer}</footer>
    </main>
  );
}
