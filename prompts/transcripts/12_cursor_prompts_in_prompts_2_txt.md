# Prompts in prompts_2.txt
_Exported on 6/4/2026 at 14:39:48 GMT from Cursor (3.6.31)_

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

---

**User**

@prompts_3.md (1-8) 

---

**Cursor**

Explorant l'écran de choix d'ouvrage et la gestion des ouvrages/unités pour implémenter l'ajout réservé aux admins.


Implémentation : fonctions DB, modal d'ajout, et bouton + sur l'écran choix d'ouvrage (réservé au rôle A).


Voici ce qui a été ajouté.

## Comportement

Sur l’écran **Choix de l’ouvrage** (`NouvelleDimensionScreen`, étape `ouvrage`), si le profil connecté a le rôle **A** (admin) :

- Un bouton **+** en petit FAB sous le bouton retour (même disposition que la loupe sur la liste des chantiers)
- Ouverture d’un **modal** avec :
  - Métier et entreprise en lecture seule (déduits du flux)
  - Nom de l’ouvrage
  - Choix de l’unité (catalogue local `unites`)
  - Prix unitaire

À la création, l’app enregistre localement un **ouvrage** + une **ouvrage_unite** (`_synced = 0`), recharge la liste, puis enchaîne directement sur la **saisie des dimensions**.

Les autres rôles (C, S, T) ne voient pas le bouton +.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `src/db/querries.js` | `getAllUnitesLocal`, `isLoggedInAdminLocal`, `insertOuvrageWithUniteLocal` |
| `src/components/terrain/AjouterOuvrageModal.js` | Modal de création |
| `src/screens/NouvelleDimensionScreen.js` | FAB + et branchement modal |

## À savoir

- Les ouvrages créés sur mobile sont **disponibles tout de suite** en local.
- La sync terrain actuelle ne **pousse pas** les ouvrages vers Supabase (catalogue en pull). Pour les partager entre appareils, il faut encore les créer dans l’**admin web** ou étendre la sync plus tard.

**Test** : connectez-vous avec un profil `role = A`, nouvelle dimension → choix métier → choix ouvrage → touchez **+**, créez un ouvrage, vérifiez qu’il apparaît et que la saisie s’ouvre.

---

**User**

2. Je voudrais que les ouvrages et ouvrages unite cree sur mobile soit sync sur cloud

---

**Cursor**

Examinant la sync terrain actuelle pour y intégrer le push des ouvrages et ouvrage_unites créés sur mobile.


Étendant le push de sync pour inclure `ouvrages` et `ouvrage_unites` côté mobile et Edge Function.


La synchronisation cloud des ouvrages créés sur mobile est en place. Voici ce qui change.

## Fonctionnement

Les ouvrages et `ouvrage_unites` créés localement (`_synced = 0`, via le modal **+**) sont maintenant inclus dans le **push** Pro, dans cet ordre :

1. `ouvrages` (filtrés par `entreprise_id`)
2. `ouvrage_unites` (liés à un ouvrage de l’entreprise)
3. puis clients, chantiers, relevés, lignes

Après un push réussi, les lignes passent en `_synced = 1` en local, comme pour le reste.

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `src/db/terrainSyncPro.js` | Collecte et comptage des `ouvrages` / `ouvrage_unites` non synchronisés |
| `supabase/functions/terrain-sync/index.ts` | Upsert cloud + sécurité par entreprise |
| `supabase/functions/README.md` | Doc mise à jour |

## Déploiement requis

La Edge Function doit être redéployée pour que le cloud accepte ces tables :

```bash
supabase functions deploy terrain-sync
```

## Conditions (inchangées)

- Compte **Pro** (`entreprises.ind_pro = 1`)
- Connexion internet
- Sync auto ~2,5 s après création (si Pro), ou manuelle depuis **Plus → Synchroniser**

## Test rapide

1. Se connecter avec un profil Pro  
2. Créer un ouvrage via **+** sur l’écran choix d’ouvrage  
3. Attendre la sync auto ou lancer une sync manuelle  
4. Vérifier dans l’**admin web** Supabase que `ouvrages` et `ouvrage_unites` contiennent les nouvelles lignes  

Sans compte Pro, les ouvrages restent **uniquement en local** (comportement existant).

