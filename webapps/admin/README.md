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

## Déploiement (admin.losange.app)

Hébergement : **Vercel**. Branche Git de production : **`v2`**.

```powershell
git checkout v2
git pull origin v2
.\scripts\deploy-admin-web.ps1
```

Prérequis :

1. Être sur la branche **`v2`** (le script refuse sinon)
2. `webapps/admin/.env.local` (copier `.env.local.example`) avec `NEXT_PUBLIC_SUPABASE_*`
3. `npx vercel login`
4. DNS : `CNAME admin` → `cname.vercel-dns.com`

**Deploy automatique (Git)** : connecter le repo sur Vercel, **Root Directory** = `webapps/admin`, **Production Branch** = `v2`.

Variables d'environnement production (Vercel) :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Le script les pousse depuis `.env.local` puis lance `vercel deploy --prod`.

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
