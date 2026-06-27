# Prompts in prompts_2.txt
_Exported on 6/5/2026 at 22:00:13 GMT from Cursor (3.6.31)_

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

---

**User**

update gitignore file

---

**Cursor**

Mise à jour du `.gitignore` : ajout de `dist-test/`, de `expo.dev` (contient des clés Supabase) et d'autres artefacts courants du projet.


`.gitignore` mis à jour avec les entrées suivantes :

| Ajout | Raison |
|--------|--------|
| `dist-*/` | Exports web de test (`dist-test/` créé par `expo export`) |
| `expo.dev` | Fichier local avec vos clés Supabase (équivalent à `.env`) |
| `.eas/` | Cache / config EAS locale |
| `*.apk`, `*.aab`, `*.ipa` | Builds Android/iOS téléchargés |
| `.claude/` | Paramètres locaux Claude |

`dist-test/` et `expo.dev` ne apparaîtront plus dans `git status`.

**Important** : `expo.dev` contient des clés Supabase en clair. Ne le commitez pas. S’il a déjà été poussé sur un dépôt distant, faites tourner la clé anon dans le dashboard Supabase.

---

**User**

@prompts_3.md (11-15) 

---

**Cursor**

Ajout des champs `date_actif_jusqua` et `date_premier_login` aux schémas local et Supabase.


Les deux champs sont ajoutés partout (SQLite local + Supabase).

## Nouveaux champs

| Table | Champ | Type local | Type Supabase |
|-------|--------|------------|---------------|
| `entreprises` | `date_actif_jusqua` | `TEXT` (nullable) | `TIMESTAMPTZ` (nullable) |
| `profils` | `date_premier_login` | `TEXT` (nullable) | `TIMESTAMPTZ` (nullable) |

## Fichiers modifiés

- **`src/db/localDb.js`** — schéma CREATE + migrations `ALTER TABLE` pour bases existantes
- **`supabase/schema.sql`** — définition + `ADD COLUMN IF NOT EXISTS`
- **`supabase/migrations/20260603140000_entreprise_profil_dates.sql`** — migration déployable
- **`src/db/terrainSync.js`** — colonnes sync pull/upsert
- **`src/screens/web/AdminScreen.js`** — édition admin web
- **`supabase/functions/terrain-sync`** et **`terrain-login`** — `date_premier_login` inclus dans le pull profils

## Déploiement Supabase

```bash
supabase db push
```

Les apps mobiles existantes recevront les colonnes au prochain démarrage (migration SQLite automatique).

Les champs sont **nullables** pour l’instant — la logique métier (expiration compte, enregistrement au premier login) pourra être branchée dans un prochain prompt.

---

**User**

@prompts_3.md (17-19) 

---

**Cursor**

Implémentation de l'enregistrement du premier login et de la vérification d'expiration Pro à chaque sync.


La logique métier est en place sur le mobile et sur Supabase.

## 1. Premier login → `date_premier_login`

- **Supabase** (`terrain-login`) : si le profil n’a pas encore de `date_premier_login`, enregistrement de la date/heure UTC au moment de la connexion.
- **Mobile** : copie locale via le payload de login + filet de sécurité `recordProfilFirstLoginLocal`.

## 2. Expiration Pro → `date_actif_jusqua`

Uniquement si `ind_pro = 1` :

- Compte actif **jusqu’à** `date_actif_jusqua` (jour inclus).
- Dès que **aujourd’hui > date_actif_jusqua** → `ind_active = 0` automatiquement.

Si `date_actif_jusqua` est vide, pas d’expiration automatique.

## 3. Où la vérification s’exécute

| Moment | Comportement |
|--------|----------------|
| **Connexion** (`terrain-login`) | Expiration + premier login côté cloud |
| **Sync** (`terrain-sync`) | Expiration avant push/pull |
| **Après chaque pull** (mobile) | Vérification locale + déconnexion si expiré |
| **Hors ligne** | `isEntrepriseActiveLocal` vérifie aussi la date |
| **Retour app / vérif session** | Contrôle après mise à jour entreprise |

## Fichiers touchés

- `supabase/functions/_shared/terrainEntreprise.ts` (nouveau)
- `supabase/functions/terrain-login/index.ts`
- `supabase/functions/terrain-sync/index.ts`
- `src/db/terrainSync.js`
- `src/db/terrainSyncPro.js`
- `src/auth/terrainAuth.js`

## Déploiement

```bash
supabase functions deploy terrain-login
supabase functions deploy terrain-sync
```

## Test rapide

1. Admin web : entreprise Pro avec `date_actif_jusqua` = hier → login mobile → *« Compte inactif. »*
2. Profil sans `date_premier_login` → première connexion → champ rempli dans Supabase et en local
3. Sync manuelle avec date dépassée → déconnexion immédiate

---

**User**

Failed to deploy edge function: Failed to bundle the function (reason: Module not found "file:///tmp/user_fn_cbjkuecorfuxythadckj_ef9aebc1-b5fa-41bf-b69c-9c8514557855_4/_shared/terrainEntreprise.ts". at file:///tmp/user_fn_cbjkuecorfuxythadckj_ef9aebc1-b5fa-41bf-b69c-9c8514557855_4/source/index.ts:2:48).

---

**Cursor**

Le bundler Supabase ne résout pas les imports `_shared` — intégration du code directement dans chaque Edge Function.


Le bundler Supabase ne résout pas les imports `../_shared/` (même problème que pour `master-admin-login`).

**Correction** : le code a été fusionné directement dans chaque `index.ts` :
- `terrain-login/index.ts` — expiration + premier login
- `terrain-sync/index.ts` — expiration
- suppression de `_shared/terrainEntreprise.ts`

Redéployez :

```bash
supabase functions deploy terrain-login
supabase functions deploy terrain-sync
```

Ou via le **Dashboard** : collez le contenu complet de chaque `index.ts` (un seul fichier, sans import local).

**Verify JWT** doit rester désactivé sur les deux fonctions.

---

**User**

date_facture est par default le jour ou la facture est creee.

---

**Cursor**

`date_facture` est maintenant renseignée automatiquement à la création du relevé (format `YYYY-MM-DD`).

## Changements

| Endroit | Comportement |
|---------|----------------|
| **Mobile** (`insertReleveLocal`) | Date du jour à chaque nouveau relevé/chantier |
| **SQLite** (`localDb.js`) | `DEFAULT (date('now'))` sur la colonne |
| **Supabase** (`schema.sql` + migration) | `DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD')` |
| **Admin web** | Prérempli avec la date du jour à la création d’un relevé |

## Migration Supabase

```bash
supabase db push
```

Les relevés déjà existants avec `date_facture` vide ne sont pas modifiés ; seules les **nouvelles** factures reçoivent la date par défaut.

---

**User**

@prompts_3.md (23-25) 

---

**Cursor**

Ajout du champ `ind_tva` sur les entreprises et adaptation de l'export devis en conséquence.


`ind_tva` est ajouté sur les entreprises et le PDF devis s’adapte en conséquence.

## Champ `ind_tva` (entreprises)

| Valeur | Comportement devis |
|--------|-------------------|
| **0** (défaut) | Total HT uniquement + montant en lettres **hors taxe** (« francs CFA ») |
| **1** | Total HT + TVA 18 % + Total TTC + montant en lettres **TTC** |

## Fichiers modifiés

- `src/db/localDb.js` — schéma + migration SQLite
- `supabase/schema.sql` + `migrations/20260603160000_entreprises_ind_tva.sql`
- `src/db/terrainSync.js` — sync du champ
- `src/screens/web/AdminScreen.js` — toggle admin (0/1)
- `src/utils/devisExport.js` — totaux conditionnels
- `src/utils/montantEnLettres.js` — libellé HT ou TTC selon `ind_tva`

## Déploiement Supabase

```bash
supabase db push
```

Puis synchroniser l’app mobile (ou modifier `ind_tva` dans l’admin web).

## Test

1. Entreprise avec `ind_tva = 0` → devis sans lignes TVA/TTC  
2. `ind_tva = 1` → devis avec TVA, TTC et « francs CFA TTC » dans l’arrêté

---

**User**

on login, assignement to constant variable

---

**Cursor**

Correction : `profilRow` était déclaré en `const` puis réassigné après le premier login.


L’erreur venait de `terrain-login/index.ts` : `profilRow` était déclaré en `const` puis réassigné après l’enregistrement du premier login (ligne 154).

Correction : `const` → `let` sur la destructuration de la requête profil.

Redéployez la fonction :

```bash
supabase functions deploy terrain-login
```

Ou recopiez le `index.ts` complet dans le Dashboard Supabase.

---

**User**

7. Dans l ecran master admin, je ne vois pas les nouveaux champs ajouté au formulaires et creation et modifications

---

**Cursor**

Les champs sont dans le schéma mais peu visibles (libellés techniques, scroll web). Amélioration des libellés, du défilement et alignement complet du schéma admin avec la base.


Les champs étaient déjà dans `TABLE_SCHEMAS`, mais difficiles à voir (noms techniques, formulaire long sans scroll web fiable). Voici ce qui a été corrigé.

## Améliorations admin web

**Libellés en français** pour les nouveaux champs :
- `ind_tva` → « Afficher TVA et TTC sur le devis »
- `date_actif_jusqua` → « Actif jusqu au (AAAA-MM-JJ) »
- `date_premier_login` → « Premier login terrain » (lecture seule)
- `date_facture` → « Date facture (AAAA-MM-JJ) »

**Sections visibles** dans le formulaire Entreprises :
- *Compte* : Pro, actif
- *Devis et validité* : TVA/TTC, date d’expiration

**Scroll web** corrigé (`overflow: auto` + padding bas) pour atteindre tous les champs en création/édition.

**Schéma complété** : `notes`, `supprime_le` sur les tables concernées.

## Où les trouver

| Table | Nouveaux champs |
|-------|-----------------|
| **Entreprises** | `ind_tva`, `date_actif_jusqua` (section « Devis et validité ») |
| **Profils** | `date_premier_login` (lecture seule) |
| **Relevés** | `date_facture` |

## Important : redéployer l’admin web

Si vous utilisez l’admin en ligne, il faut **rebuilder et redéployer** pour voir les changements :

```bash
npx expo export --platform web
eas deploy --prod
```

En local : `npm run web` puis rafraîchir le navigateur (Ctrl+F5).

---

**User**

@prompts_3.md (29-38) 

---

**Cursor**

Analysant l'écran détails chantier et la navigation pour appliquer les changements demandés.


L’écran détails chantier et la barre de navigation sont mis à jour selon le prompt.

## Barre du bas (détails chantier)

| Avant | Après | Action |
|-------|-------|--------|
| Chantiers | **Retour a la liste** | Retour à la liste des chantiers |
| Plus | **Modifier** | Ouvre l’édition du chantier (flux dimensions) |

## FABs (colonne droite)

| Position | Avant | Après | Comportement |
|----------|-------|-------|----------------|
| **Grand** (haut) | Devis (bleu) | **PDF** (rouge, `file-pdf-box`) | 1 tap → overlay Télécharger / WhatsApp |
| **Petit** (bas) | Crayon (modifier) | **Devis** (bleu, `file-document`) | 1 tap = afficher/masquer prix · 2 taps = overlay export |

## Export PDF

- Même overlay que le devis (Télécharger + WhatsApp)
- Même générateur PDF pour l’instant (format devis) — prêt à être remplacé plus tard
- Pas de double-tap sur PDF
- Le statut chantier passe toujours en « Devis » après export (comme avant)

## Fichiers modifiés

- `App.js` — libellés et actions de la nav sur `chantierDetails`
- `ChantierDetails.js` — FABs réorganisés, export unifié devis/PDF

---

**User**

couleur de retour a la liste (gris).

---

**Cursor**

Sur l’écran détails chantier, le bouton **Retour a la liste** utilise maintenant le gris `#9CA3AF` (comme le FAB retour), avec texte et icône blancs.

---

**User**

@prompts_3.md (41-48) 

---

**Cursor**

Implémentant le format PDF « Dimensions » distinct du devis.


Je vérifie les imports et le flux WhatsApp pour le PDF dimensions.


Le format PDF **Dimensions** (prompt #9) est en place. Voici ce qui a été fait :

### Format PDF Dimensions
- **Titre** : `DIMENSIONS - {client} / {chantier}` (plus de « Devis estimatif » ni de lignes client/chantier séparées)
- **Notes chantier** : `Notes: xxx` affiché avant la liste si `chantier.notes` est renseigné
- **Liste** : même regroupement que la colonne Désignation du devis (métier → ouvrage), sans tableau ni en-têtes
- **Lignes dimension** (`ind_dimension = 1`) : affichage **L x H x [P] x N** en gros caractères, aligné à gauche
- **Notes ligne** : `--> {note}` avant chaque mesure
- **Pas de pied de page** : signatures, footer, arrêté, etc. supprimés

### Fichiers modifiés
- `src/utils/formatLigneMesures.js` — `formatLigneDimensionsLxhN()`
- `src/utils/devisGrouping.js` — champs `note`, `isDimensionLine`, `dimensionLxhN` sur les lignes d’export
- `src/utils/devisExport.js` — `buildDimensionsPdfHtml`, `generateDimensionsPdfFile`, `downloadDimensionsPdf` (fichier `dimensions_*.pdf`)
- `src/screens/ChantierDetails.js` — le FAB rouge **PDF** utilise ce format ; le FAB bleu **Devis** garde le devis classique

### Test
Sur un chantier avec des lignes dimensionnées et des notes :
1. Appuyer sur le FAB rouge **PDF**
2. Choisir **Télécharger** ou **WhatsApp**
3. Vérifier le titre, les notes chantier, les `--> notes ligne` et les mesures L×H×N

Dis-moi si tu veux ajuster la taille de police ou le libellé du titre (casse, tirets, etc.).

---

**User**

@prompts_3.md (49-51) 

---

**Cursor**

Je mets les notes de ligne sur la même ligne que les dimensions, comme demandé.


C’est fait. Les notes de ligne sont maintenant sur la **même ligne** que la mesure dans le PDF Dimensions :

`105 x 302 x 4 --> notes xxx`

- Avec mesure **et** note : `{mesure} --> {note}`
- Mesure seule : `{mesure}`
- Note seule (sans mesure) : `--> {note}`

Le regroupement métier / ouvrage reste inchangé au-dessus. Regénère un PDF depuis le FAB rouge pour vérifier le rendu.

---

**User**

11. Reduit beaucoup les tailles des polices des notes de chantier et de ligne releve. La police des dimensions est bonne

---

**Cursor**

Je sépare les styles : dimensions inchangées, notes chantier et notes de ligne en police beaucoup plus petite.


C’est fait. Dans le PDF Dimensions :

- **Notes chantier** : 22px → **13px** (`Notes: xxx` en haut)
- **Notes de ligne** : **13px** sur la même ligne que la mesure, ex. `105 x 302 x 4` (32px) `--> notes xxx` (13px)
- **Dimensions** : inchangées à **32px**

Regénère un PDF pour valider le rendu. Si tu veux encore plus petit (ex. 11px), dis-le.

---

**User**

complete la fleche. pas de --> mais plutot fleche icon entiere

---

**Cursor**

C’est fait. `-->` est remplacé par la flèche Unicode **→** dans le PDF Dimensions :

`105 x 302 x 4 → notes xxx`

Même chose pour une ligne avec note seule : `→ notes xxx`.

---

**User**

les dimension en rouge

---

**Cursor**

C’est fait. Les mesures (`105 x 302 x 4`, etc.) s’affichent maintenant en **rouge** (`#C62828`, même rouge que le bouton PDF). Les notes restent en noir et en petite police.

---

**User**

au lieu de 13 pour les notes, augmente a 17

---

**Cursor**

C’est fait. Les notes du chantier et les notes de ligne passent de **13px** à **17px** dans le PDF Dimensions. Les dimensions en rouge restent à 32px.

---

**User**

Augmente la fleche et ajoute espace a gauche et a droite de la fleche

---

**Cursor**

C’est fait. La flèche est maintenant dans un élément dédié :

- **Taille** : 26px (plus grande que les notes à 17px)
- **Espacement** : 12px à gauche et à droite (`padding: 0 12px`)

Rendu : `105 x 302 x 4` **→** `notes xxx` avec une flèche plus visible et mieux espacée.

---

**User**

Augmente la police des ouvrages

---

**Cursor**

C’est fait. La police des ouvrages passe de **22px** à **28px** dans le PDF Dimensions (métier : 24px, dimensions : 32px).

---

**User**

Underline les ouvrages

---

**Cursor**

C’est fait. Les noms d’ouvrages sont maintenant **soulignés** dans le PDF Dimensions.

---

**User**

Centre les ouvrages

---

**Cursor**

C’est fait. Les noms d’ouvrages sont maintenant **centrés** dans le PDF Dimensions (toujours soulignés, 28px).

---

**User**

Ajoute la date du releve (en footer corner bottom right)

---

**Cursor**

Je regarde comment la date du relevé est stockée et comment le PDF Dimensions est généré.


J'ajoute `date_facture` du relevé à la requête et un pied de page en bas à droite du PDF.


C’est fait. La **date du relevé** (`date_facture`) s’affiche en bas à droite du PDF Dimensions.

- Source : champ `date_facture` du relevé lié aux lignes
- Format : français, ex. `03 juin 2026`
- Position : coin inférieur droit (`position: fixed`)

La requête `getLignesByChantierLocal` expose maintenant `releve_date_facture` pour alimenter ce footer. Regénère un PDF pour vérifier le rendu.

---

**User**

@prompts_3.md (55-61) 

---

**Cursor**

J’explore l’écran Profil, la navigation Plus et la gestion admin / sync entreprise.


J’implémente l’édition entreprise pour les admins, la navigation Profil et la sync Pro.


C’est en place. Voici ce qui a été ajouté pour le prompt #10 :

### Écran Profil (admin)
- Affichage de **Appliquer TVA** (Oui / Non)
- En mode édition : **Nom de l’entreprise** + bascule **TVA Oui/Non**
- Seul le rôle **Admin** peut modifier ces champs

### Navigation bas (écran Profil, admin)
- **Retour** (gris, sans flèche) → retour au menu Plus
- **Modifier** → active l’édition
- **Enregistrer** → sauvegarde et quitte le mode édition

### Sauvegarde & sync Pro
- `updateEntrepriseAdminLocal()` met à jour `nom` et `ind_tva` localement (`_synced = 0`)
- Compte **Pro** : sync auto via la file existante (`scheduleTerrainSyncAfterWrite`, ~2,5 s)
- Sync manuelle (FAB sync dans Plus) envoie aussi l’entreprise si non synchronisée
- Push cloud ajouté pour la table `entreprises` (admin uniquement, champs `nom` + `ind_tva`)

### Fichiers modifiés
- `src/screens/ProfilScreen.js`
- `App.js`
- `src/db/querries.js`
- `src/db/terrainSync.js`
- `src/db/terrainSyncPro.js`
- `src/db/terrainSyncMerge.js`
- `supabase/functions/terrain-sync/index.ts`

### Déploiement requis
```bash
supabase functions deploy terrain-sync
```

### Test rapide
1. Se connecter en **Admin Pro**
2. **Plus → Profil**
3. **Modifier** → changer nom et TVA → **Enregistrer**
4. Vérifier le devis (TVA selon le choix)
5. Lancer la sync manuelle ou attendre la sync auto et vérifier dans Supabase

---

**User**

@access_rules.md (1-16) 

---

**Cursor**

J’explore le code pour repérer où appliquer les règles d’accès (chantier, relevé, profil, masquage devis/prix).


Je crée les utilitaires d'accès et j'applique les restrictions dans les écrans et requêtes concernés.


Les règles d'accès de `access_rules.md` sont implémentées.

### Propriété chantier / relevé (`prise_par_id`)
- Seul l’**Admin (A)** ou l’utilisateur qui a **pris le relevé** peut modifier
- Contrôles en base : lignes, statut chantier, suppression, finalisation du brouillon
- UI : bouton **Modifier** masqué si pas le droit ; changement de statut sur la liste bloqué avec alerte

### Profil entreprise
- Renforcé côté serveur local : `updateEntrepriseAdminLocal` refuse si pas Admin
- L’UI Profil reste réservée à l’admin (déjà en place)

### Comptes **C** (Chantier) et **T** (Atelier) — prix masqués
| Écran | Comportement |
|--------|----------------|
| **Détail chantier** | Bouton **Devis** (FAB bleu) masqué |
| **Récapitulatif** | P.U. masqués |
| **Pavé numérique** | Bouton **Prix**, P.U. et **Montant** masqués |

### Fichiers clés
- `src/utils/terrainAccess.js` — helpers rôles et droits
- `src/db/querries.js` — gardes + `getReleveByChantierLocal` / `canCurrentUserModifyChantierLocal`
- `App.js`, `ChantierDetails.js`, `NouvelleDimensionScreen.js`, `PaveSaisieOneHand.js`, `ListeChantiers.js`, `LigneReleveCard.js`

### Tests suggérés
1. **C** ouvre un chantier pris par un autre → pas de **Modifier**, alerte si tentative de changement de statut
2. **C** sur son propre chantier → modification OK, pas de devis ni de prix
3. **A** → tout accessible, modification profil entreprise OK
4. **S** (Commercial) → devis et prix visibles, mais pas de modification des chantiers des autres

