import { ROLE_LABELS } from '@/lib/auth/constants';

export default function WelcomeJumbotron({ session }) {
  const roleLabel = ROLE_LABELS[session.role] || session.role;

  return (
    <section className="welcome-jumbotron">
      <p className="welcome-kicker">Accueil</p>
      <h2 className="welcome-title">Bienvenue {session.prenom}</h2>
      <p className="welcome-text">
        Vous êtes connecté en tant que {roleLabel} pour {session.entrepriseNom}.
      </p>
      <p className="welcome-hint">
        Cet espace servira à gérer les chantiers, les devis et les paramètres de l&apos;application.
      </p>
    </section>
  );
}
