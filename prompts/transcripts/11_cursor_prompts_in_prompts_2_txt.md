# Prompts in prompts_2.txt
_Exported on 6/3/2026 at 20:05:47 GMT from Cursor (3.6.31)_

---

**User**

@prompts_2.txt (145-146) 

---

**Cursor**

Explorant la configuration actuelle de l'écran admin et les options de déploiement déjà en place.


Votre projet est **déjà prêt pour le web** : sur `Platform.OS === 'web'`, l’app affiche uniquement le login MASTER puis `AdminScreen`, branché sur Supabase (`supabaseAdmin.js` + Edge Functions `master-admin-login` / `master-admin-verify`).

La voie la plus rapide en production, compte tenu que vous utilisez déjà **EAS** pour Android :

---

## Chemin recommandé : export web + EAS Hosting (~15–30 min)

### 1. Backend Supabase (une fois)

Vérifiez que c’est en place (voir `supabase/functions/README.md`) :

- Schéma / migrations appliquées (`supabase db push` ou SQL dans le dashboard)
- Fonctions déployées : `master-admin-login`, `master-admin-verify`
- **Verify JWT désactivé** sur ces deux fonctions
- Secrets : `MASTER_ADMIN_IDENTIFIANT`, `MASTER_ADMIN_PASSWORD`, `MASTER_SESSION_SECRET`

Test rapide dans le dashboard Supabase : body `{ "identifiant": "...", "motDePasse": "..." }` sur `master-admin-login` → `{ "ok": true, "token": "..." }`.

### 2. Variables d’environnement pour le build web

Les clés sont lues au **build** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans `.env.example`).

```bash
npx eas env:push --environment production
```

(ou créez les variables **production** dans [expo.dev](https://expo.dev) → votre projet → Environment variables)

### 3. Export + déploiement

```bash
npx expo export --platform web
eas deploy --prod
```

Vous obtenez une URL du type `https://<votre-slug>.expo.app` — c’est votre admin web en production.

Option utile dans `app.json` (SPA une seule page, comme votre `App.js`) :

```json
"web": {
  "output": "single",
  "favicon": "./assets/favicon.png"
}
```

---

## Alternative tout aussi rapide : Vercel / Netlify

Si vous préférez un domaine custom sans passer par Expo :

1. `npx expo export --platform web` (génère `dist/`)
2. Glisser `dist/` sur Vercel/Netlify, ou connecter le repo avec :
   - **Build** : `npx expo export --platform web`
   - **Publish directory** : `dist`
   - Variables : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Ce qui n’est **pas** la prod

| Méthode | Usage |
|--------|--------|
| `npm run web` / `expo start --web` | Dev local uniquement |
| Tunnel Expo | Démo temporaire, pas une URL stable |

---

## Test local avant prod (2 min)

```bash
npm run web
```

Ouvrir `http://localhost:8081` → login MASTER → `AdminScreen`.

---

## Sécurité MVP (à avoir en tête)

- L’accès UI est protégé par **master-admin** (session dans `sessionStorage`).
- Les tables admin passent par la **clé anon** Supabase avec des policies ouvertes (`anon_all_*` dans `schema.sql`) : pour un MVP interne c’est acceptable ; plus tard, restreindre RLS et/ou passer par des Edge Functions pour les écritures sensibles.

---

## Résumé

| Étape | Action |
|-------|--------|
| 1 | Supabase + Edge Functions MASTER OK |
| 2 | `eas env:push` (prod) avec les `EXPO_PUBLIC_*` |
| 3 | `npx expo export --platform web` |
| 4 | `eas deploy --prod` |

Comme vous avez déjà le `projectId` EAS dans `app.json`, c’est le chemin le plus court sans nouveau stack.

Si vous voulez, je peux enchaîner dans le repo : ajouter `"web": { "output": "single" }`, un script `deploy:web` dans `package.json`, et un petit checklist dans `prompts/production.md`.

