'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Arial, Helvetica, sans-serif',
          background: '#f8f9fa',
          color: '#212529',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h1 style={{ marginTop: 0 }}>Une erreur est survenue</h1>
          <p style={{ color: '#6c757d' }}>{error?.message || 'Erreur inattendue.'}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '12px',
              minHeight: '44px',
              border: 'none',
              borderRadius: '10px',
              background: '#ff5722',
              color: '#fff',
              fontWeight: 700,
              padding: '0 16px',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
