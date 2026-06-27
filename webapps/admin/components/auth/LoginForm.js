'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LosangeLogo from '@/components/brand/LosangeLogo';
import { APP_NAME } from '@/lib/theme/colors';
import { IDENTIFIANT_PATTERN } from '@/lib/auth/constants';

export default function LoginForm() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedIdentifiant = useMemo(() => identifiant.trim().toUpperCase(), [identifiant]);
  const hasValidIdentifiant = IDENTIFIANT_PATTERN.test(normalizedIdentifiant);
  const canSubmit = hasValidIdentifiant && motDePasse.trim().length > 0;

  const handleIdentifiantChange = (event) => {
    const value = event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setIdentifiant(value.slice(0, 4));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setAuthError('');

    if (!canSubmit) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifiant: normalizedIdentifiant,
          motDePasse,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setAuthError(result.error || 'Erreur de connexion.');
        return;
      }

      router.replace('/tableau-de-bord');
      router.refresh();
    } catch (error) {
      setAuthError(error.message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-logo-wrap">
        <LosangeLogo size={120} />
        <h1 className="login-app-name">{APP_NAME}</h1>
      </div>

      <header className="login-header">
        <h2 className="login-title">Connexion</h2>
        <p className="login-subtitle">Entrez votre identifiant et mot de passe.</p>
      </header>

      <form className="login-form-card" onSubmit={handleLogin} noValidate>
        <label className="field-label" htmlFor="identifiant">
          Identifiant
        </label>
        <input
          id="identifiant"
          className="field-input"
          value={identifiant}
          autoCapitalize="characters"
          autoCorrect="off"
          maxLength={4}
          onChange={handleIdentifiantChange}
          placeholder="A01B"
        />
        {submitted && !hasValidIdentifiant ? (
          <p className="field-error">L&apos;identifiant est requis.</p>
        ) : null}

        <label className="field-label" htmlFor="motDePasse">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          type="password"
          className="field-input"
          value={motDePasse}
          onChange={(event) => setMotDePasse(event.target.value)}
        />
        {submitted && motDePasse.trim().length === 0 ? (
          <p className="field-error">Le mot de passe est requis.</p>
        ) : null}

        {authError ? <p className="field-error">{authError}</p> : null}

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
