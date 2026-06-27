# Deploy manuel — Webapp Admin (Vercel)

Application : **Next.js** dans `webapps/admin`  
**Pas** le master (`losange-master.expo.app`).

| | |
|---|---|
| Domaine cible | `https://admin.losange.app` |
| URL Vercel | `https://losange-admin.vercel.app` |
| Branche Git prod | **`v2`** |
| Projet Vercel | `losange-admin` |

---

## Prérequis (une fois)

1. Node.js + npm installés
2. Compte Vercel : `npx vercel login`
3. Fichier `webapps/admin/.env.local` (copier depuis `.env.local.example`) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

4. Dépendances :

```powershell
cd webapps\admin
npm install
```

---

## Deploy manuel (CLI)

Depuis la **racine du repo**, sur la branche **`v2`** :

```powershell
git checkout v2
git pull origin v2

cd webapps\admin
```

### 1. Lier le projet (première fois seulement)

```powershell
npx vercel link --yes --project losange-admin
```

### 2. Pousser les variables d'environnement (production)

```powershell
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# coller la valeur quand demandé

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# coller la valeur quand demandé
```

Ou laisser le script les synchroniser depuis `.env.local` (voir plus bas).

### 3. Vérifier le build en local

```powershell
npm run build
```

### 4. Deploy production

```powershell
npx vercel deploy --prod --yes
```

Preview (test, sans prod) :

```powershell
npx vercel deploy --yes
```

---

## Script tout-en-un (recommandé)

Depuis la racine du repo, branche **`v2`** :

```powershell
git checkout v2
git pull origin v2
.\scripts\deploy-admin-web.ps1
```

Options utiles :

| Option | Effet |
|--------|--------|
| `-PreviewOnly` | Deploy preview seulement |
| `-SkipEnvSync` | Ne pas mettre à jour les env Vercel |
| `-SkipDomain` | Ne pas tenter d'ajouter le domaine |
| `-AllowOtherBranch` | Deploy hors branche `v2` (dev) |

---

## Domaine custom `admin.losange.app`

### Vercel

```powershell
cd webapps\admin
npx vercel domains add admin.losange.app losange-admin
```

Ou : Vercel Dashboard → projet **losange-admin** → **Settings** → **Domains**.

### DNS (registrar `losange.app`)

| Type | Name | Value |
|------|------|--------|
| CNAME | `admin` | `cname.vercel-dns.com` |

---

## Deploy auto via Git (optionnel)

Vercel Dashboard → **Import Git Repository** :

- **Root Directory** : `webapps/admin`
- **Production Branch** : `v2`
- **Build Command** : `npm run build`
- **Install Command** : `npm install`

Variables à configurer dans Vercel (Production) :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Vérification

- Prod : https://admin.losange.app (ou https://losange-admin.vercel.app)
- Login admin avec un compte terrain **A / S / T** (Pro)
- Dashboard Vercel : https://vercel.com/dashboard

---

## Dépannage rapide

| Problème | Action |
|----------|--------|
| Build échoue | `npm run build` en local, corriger les erreurs |
| Env manquantes | Vérifier `.env.local` ou Vercel → Settings → Environment Variables |
| Mauvaise branche | `git checkout v2` avant deploy |
| Domaine ne répond pas | Vérifier CNAME + attente propagation DNS (jusqu'à 48 h) |
