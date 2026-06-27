# Losange Admin (Next.js)

Application web d'administration pour les comptes **A**, **S**, **T** et le compte master **Y62L**.

## Démarrage

```bash
cd webapps/admin
cp .env.local.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

```
app/
  (app)/              # Pages authentifiées (sidebar fixe + navbar entreprise)
    accueil/          # Jumbotron Bienvenue {prenom}
    tableau-de-bord/
    chantiers/
    clients/
    ouvrages/
    articles/
    parametres/
    profil/
  login/
  api/auth/
components/
  auth/               # LoginForm
  brand/              # Logo Losange
  dashboard/          # Jumbotron
  layout/             # Sidebar, PageNavbar, EntrepriseBrandHeader
lib/
  auth/               # terrain-login + master-admin-login
  navigation/         # Menus sidebar
  supabase/
  theme/              # Couleurs mobile Losange
```

## Authentification

- Comptes terrain **A / S / T** : Edge Function `terrain-login`
- Compte master **Y62L** : Edge Function `master-admin-login`
- Navbar : logo entreprise (Supabase Storage) avec repli sur `/logo.png`
