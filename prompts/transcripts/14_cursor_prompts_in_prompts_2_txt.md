# Prompts in prompts_2.txt
_Exported on 6/7/2026 at 11:41:43 GMT from Cursor (3.7.12)_

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

---

**User**

- Sur l ecran choix de metier et choix ouvrage, assure toi que scroll est possible si il y a beaucoup de donnees

---

**Cursor**

Je vérifie comment les écrans de choix métier et ouvrage gèrent le défilement.


Le choix métier n’est pas dans un `ScrollView` ; je corrige ça dans `NouvelleDimensionScreen` et `SelecteurMetierOuvrage`.


C’est fait. Le défilement est assuré sur les deux flux de sélection :

### `NouvelleDimensionScreen`
- **Choix métier** : liste enveloppée dans un `ScrollView` (avant, pas de scroll possible)
- **Choix ouvrage** : `ScrollView` renforcé avec `flex: 1` et padding bas pour les FABs

### `SelecteurMetierOuvrage`
- Tout le contenu (métiers + panneau ouvrages/unités) est dans un **seul `ScrollView`**
- Suppression du `minHeight: '42%'` et du `justifyContent: 'space-between'` qui bloquaient le scroll

Avec beaucoup de métiers ou d’ouvrages, la liste défile verticalement tout en gardant les FABs accessibles en bas.

---

**User**

 Au lieu de nouvelle dimension, renomme le header nouveau relevé

---

**Cursor**

C’est fait. Le titre par défaut du header passe de **« Nouvelle dimension »** à **« Nouveau relevé »** (étapes métier et ouvrage).

Inchangé :
- **Récapitulatif** à l’étape récap
- **Nom de l’ouvrage** à l’étape saisie des dimensions

---

**User**

Le logo de l app se trouve dans /prompts/logo.png. Change la couleur du premier losange (jaune) en dark orange (couleur de nos bouton orange dans l'app). Cree un nouveau fichier logo2.png

---

**Cursor**

Je traite le logo avec Python pour remplacer le jaune par l'orange `#FF5722` de l'app.


`prompts/logo2.png` est créé.

- **Losange avant (jaune)** → orange foncé **`#FF5722`** (couleur `primary` de l’app)
- **Losange arrière (noir)** → inchangé
- **Fond blanc** → inchangé

Fichier : `prompts/logo2.png` (à côté de `prompts/logo.png`). Dis-moi si tu veux l’utiliser comme icône dans `app.json` / Expo.

---

**User**

@design.md (141-142) 

---

**Cursor**

J’intègre `logo2.png` comme logo, icône, écran de login, loader pulsant et fond de la page Plus.


`logo2.png` est intégré partout selon le design.

### Icône & splash (`app.json`)
- **Icône app** : `assets/logo2.png`
- **Splash** et **icône Android adaptive** : même logo
- Fichiers copiés dans `assets/` (icon, splash, favicon)

### Composants (`LosangeLogoLoader.js`)
- **`LosangeLogo`** — logo statique
- **`LosangeLogoLoader`** — pulsation rapide (~560 ms par cycle)
- **`LosangeLogoBackground`** — filigrane à faible opacité

### Écrans
| Emplacement | Comportement |
|-------------|--------------|
| **Login** | Logo centré au-dessus du formulaire |
| **Plus** | Logo en arrière-plan (opacité 10 %) |
| **Chargements** | Logo pulsant à la place des spinners (session, profil, métiers/ouvrages, chantiers, détails, admin web) |

### Pour voir la nouvelle icône sur le téléphone
Il faut **rebuilder** l’app native :
```bash
npx expo prebuild
# ou eas build pour Android/iOS
```
En dev Expo Go, l’icône installée ne change pas, mais login, chargements et page Plus affichent déjà le nouveau logo.

---

**User**

le nom de l app Losange dans les ecrans, pas losange_NEW

---

**Cursor**

Je mets le nom affiché à **Losange** dans `app.json` et sur l'écran de connexion.


C’est fait.

### Changements
- **`app.json`** : nom affiché sous l’icône → **« Losange »** (le `slug` reste `losange_NEW` pour EAS/Expo)
- **`theme.js`** : constante `APP_NAME = 'Losange'`
- **Login** : **« Losange »** sous le logo, puis « Connexion » ou « Admin MASTER »

Sur l’écran de connexion tu vois maintenant le logo + **Losange** + le titre de l’écran. Pour le nom sous l’icône installée, rebuild l’app native.

---

**User**

Ajoute icon arrow back aux boutons retour (bottom nav)

---

**Cursor**

C’est fait. Les boutons **Retour** de la barre du bas affichent maintenant l’icône **←** (`arrow-left`) :

- **Profil** → `Retour`
- **Détail chantier** → `Retour a la liste`

Les autres cas restent inchangés : **Chantiers** (briefcase), **Enregistrer** (save) en flux dimension.

---

**User**

Dans le formulaire Nouvel ouvrage (cree), Enleve le nom de l entreprise

---

**Cursor**

C’est fait. Dans le formulaire **Nouvel ouvrage**, la ligne **Entreprise** a été retirée. Il ne reste que le **métier** en contexte, puis les champs nom, unité et prix.

---

**User**

@design.md (148-150) 

---

**Cursor**

J’explore la structure actuelle (Plus, clients, FABs) pour ajouter Base de données et la liste des clients.


J’implémente les écrans Base de données, liste et détail clients, avec les requêtes et la navigation.


La fonctionnalité **design.md (148-150)** est en place. Voici ce qui a été ajouté :

### Navigation
- **Plus** → bouton **Base de données** (icône `database`, même style que Profil)
- **Base de données** → bouton **Liste des clients** (icône `account-group`)
- **Liste des clients** → cartes cliquables ; FAB recherche (`magnify`, comme les chantiers)
- **Détail client** → FAB **Modifier** (`pencil`, orange) et **Supprimer** (`delete`, rouge)

### Fichiers créés
- `src/screens/DatabaseScreen.js`
- `src/screens/ListeClientsScreen.js`
- `src/screens/ClientDetailsScreen.js`
- `src/components/terrain/ClientFormModal.js`

### Fichiers modifiés
- `src/screens/PlusScreen.js` — bouton Base de données
- `App.js` — écrans `database`, `listeClients`, `clientDetails` + chaîne Retour
- `src/db/querries.js` — `getClientsByEntrepriseLocal`, `getClientByIdLocal`, `deleteClientLocal` (soft delete via `supprime_le`)

### Comportement
- **Modifier** ouvre un modal (nom, téléphone 1, téléphone 2)
- **Supprimer** demande confirmation puis marque le client comme supprimé localement
- La barre du bas : **Retour** remonte `détail → liste → base de données → Plus` ; **Plus** reste accessible sur tout le flux

Tu peux tester en allant dans **Plus → Base de données → Liste des clients**.

---

**User**

Dans le PDF, les ouvrages avec unites n n apparaisse pas (ind_unitaire=1). pour eux pas de lxhxn, mais n seulement.


---

**Cursor**

Je cherche où le PDF formate L×H×N et comment `ind_unitaire` est géré pour ces ouvrages.


Les ouvrages unitaires (`ind_dimension=0`) n’ont pas de mesure dans le PDF Dimensions — j’ajoute l’affichage de `n` seul.


Corrigé. Dans le PDF **Dimensions**, les ouvrages **unitaires** (`ind_dimension = 0`, ancien `ind_unitaire = 1`) n’avaient aucune mesure affichée : seules les lignes dimensionnelles (`ind_dimension = 1`) passaient par le format L×H×N.

### Comportement maintenant
| Type d’unité | Affichage PDF Dimensions |
|---|---|
| Dimensionnel (`ind_dimension = 1`) | `L x H x [P] x N` (rouge) |
| Unitaire (`ind_dimension = 0`) | **`n` seulement** (rouge) |

### Fichiers modifiés
- `formatLigneMesures.js` — `formatLigneNombrePdf()` pour les lignes unitaires
- `devisGrouping.js` — champ `nombrePdf` sur chaque ligne d’export
- `devisExport.js` — `renderDimensionLigneHtml` utilise `nombrePdf` quand ce n’est pas une ligne dimensionnelle

Tu peux regénérer un PDF Dimensions sur un chantier avec des ouvrages unitaires (ex. « pièce », « forfait ») pour vérifier que le `n` apparaît bien sous le nom d’ouvrage.

---

**User**

- Changer la couleur des boutons dans ...Plus de full orange a white avec border orange. on click, orange


---

**Cursor**

Création d’un composant bouton réutilisable (blanc + bordure orange, orange au clic) et application dans l’écran Plus.


Les boutons du menu **Plus** ont un nouveau style :

- **Repos** : fond blanc, bordure orange (`#FF5722`), texte et icône orange  
- **Appui** : fond orange plein, texte et icône blancs  

Composant partagé `PlusMenuButton.js`, utilisé pour **Profil** et **Base de données** dans `PlusScreen`, et pour **Liste des clients** dans `DatabaseScreen` (même style dans tout le flux Plus).

---

**User**

- Dans les boutons, augmente la taille des polices pour une meilleur lisibilite. Ne pas deborder hors des boutons


---

**Cursor**

Augmentant la taille de police et de l’icône dans `PlusMenuButton`, en gardant le texte contenu dans le bouton.


Les boutons du menu **Plus** (`PlusMenuButton`) ont été ajustés :

- **Police** : 16 → **20** (line-height 24)
- **Icône** : 22 → **26**
- **Contenu** : bouton pleine largeur, `overflow: hidden`, padding vertical renforcé
- **Anti-débordement** : texte sur une ligne avec `flexShrink`, `adjustsFontSizeToFit` et `minimumFontScale={0.88}` pour les libellés longs (« Base de donnees », « Liste des clients »)

Le texte reste lisible et contenu dans le bouton, même sur petit écran.

---

**User**

Pas ceux du menu Plus seulement, mais partout dans l app (ecran mobile)

---

**Cursor**

Je vais repérer tous les boutons de l’app mobile et harmoniser la taille de police partout.


Mise en place d’un style bouton global via le thème et d’un composant `MobileButton` pour l’appliquer partout sur mobile.


La taille des polices bouton est maintenant harmonisée sur **toute l’app mobile**.

### Approche globale
- **`theme.js`** — constantes partagées :
  - Boutons standard : **18px** (line-height 22)
  - Menu Plus : **20px**
  - Pavé numérique : **22px**
  - Hauteur min. : **58px**
- **`MobileButton`** — wrapper autour de `Button` (Paper) qui applique ces styles par défaut
- **Thème Paper** — `fonts.labelLarge` mis à jour pour couvrir les cas restants

### Écrans / composants migrés
- Barre de navigation (`App.js`)
- Login, ChantierDetails, NouvelleDimension, SelecteurMetierOuvrage, PaveSaisieOneHand
- Modales : Client, Ouvrage, Note
- Pavé numérique, boutons Plus (`PlusMenuButton`)
- Boutons TVA du Profil (18px)

### Anti-débordement
- Padding horizontal renforcé sur les boutons
- Hauteurs min. augmentées pour accueillir le texte plus grand
- `PlusMenuButton` conserve `adjustsFontSizeToFit` pour les libellés longs

L’**Admin web** n’est pas modifié (écran séparé).

---

**User**

Pour le bottom nav, les icones chevauche les ecritures. corrige

---

**Cursor**

Le chevauchement vient du layout horizontal avec une police plus grande. Je passe la bottom nav en disposition verticale (icône au-dessus du texte).


Le `Button` de Paper impose des marges d’icône en ligne ; je crée un composant dédié pour la bottom nav en layout vertical.


La bottom nav utilisait le `Button` Paper en ligne : avec la police agrandie, les marges négatives de l’icône faisaient chevaucher icône et texte.

### Correction
Nouveau composant **`BottomNavButton`** avec :
- **Icône au-dessus du libellé** (layout vertical)
- Texte centré, **2 lignes max** avec `adjustsFontSizeToFit` pour « Retour a la liste »
- Espacement propre entre icône et texte, sans marges Paper

Les deux boutons de la barre du bas dans `App.js` utilisent ce composant. Les autres boutons de l’app restent sur `MobileButton`.

---

**User**

Ne pas montrer le bouton sync dans Gratuit

---

**Cursor**

Le bouton sync n’apparaîtra que pour les comptes Pro (`ind_pro = 1`).


Le bouton **sync** dans l’écran **Plus** n’est affiché que pour les comptes **PRO** (`ind_pro = 1` sur l’entreprise).

Pour un compte **Gratuit**, seul le bouton **Déconnexion** reste visible à droite. Le type de compte est lu au chargement de l’écran via le même critère que le badge « Gratuit » / « PRO » du profil.

---

**User**

16. Dans ...Plus, Apres la premiere page (Plus), tout les boutons du bottom nav bar a gauche sont retour

---

**Cursor**

Les sous-pages Plus utilisaient un bouton « Retour » en mode outlined avec texte blanc — illisible. Je corrige la logique pour un Retour gris contenu sur toutes les sous-pages Plus.


Corrigé. Dans le flux **Plus**, après la page d’accueil, le bouton gauche de la bottom nav est toujours **Retour** (gris, icône flèche).

### Comportement
| Écran | Bouton gauche |
|---|---|
| **Plus** (accueil) | Chantiers |
| Profil, Base de données, Liste clients, Détail client | **Retour** → remonte d’un niveau |
| Détails chantier | Retour à la liste |

### Correction technique
Les sous-pages Plus utilisaient un bouton **outlined** avec texte blanc sur fond blanc — le libellé « Retour » était peu ou pas visible. Elles utilisent maintenant le même style **contained gris** que « Retour à la liste » sur les détails chantier.

Chaîne Retour : `détail client → liste → base de données → Plus`.

---

**User**

Dans base de donnees ajoute le bouton Liste des ouvrages. On clique, montre le detail de l ouvrage, incluant les ouvrages unites. 

---

**Cursor**

J’explore la structure des ouvrages et le flux « Base de données » existant pour ajouter « Liste des ouvrages ».


J’ajoute les requêtes, les écrans liste/détail ouvrages et la navigation dans le flux Base de données.


La fonctionnalité **Liste des ouvrages** est en place dans Base de données.

### Navigation
**Plus → Base de données → Liste des ouvrages → Détail ouvrage**

- **Retour** : détail → liste → base de données → Plus

### Base de données
- Nouveau bouton **Liste des ouvrages** (icône `hammer-wrench`, même style que les autres)

### Liste des ouvrages
- Cartes avec **nom** + **métier** (couleur métier)
- FAB recherche (`magnify`) par nom ou métier
- Pull-to-refresh

### Détail ouvrage
- **Nom** et **métier**
- Section **Ouvrages unités** : pour chaque unité
  - Nom, formule, unité
  - Type : Dimension (L×H×N) ou Unitaire (n)
  - Prix unitaire

### Fichiers
- `getOuvragesByEntrepriseLocal`, `getOuvrageByIdLocal` dans `querries.js`
- `ListeOuvragesScreen.js`, `OuvrageDetailsScreen.js`
- Mises à jour de `DatabaseScreen.js` et `App.js`

---

**User**

Au lieu de Liste des clients et liste des ouvrages, mettre : Clients, Ouvrages

---

**Cursor**

Les libellés ont été raccourcis :

- **Base de données** : `Clients` et `Ouvrages` (au lieu de « Liste des clients » / « Liste des ouvrages »)
- **Titres des écrans liste** : alignés sur les mêmes intitulés

---

**User**

Icones chevauche Notes et Prix

---

**Cursor**

Les boutons Notes/Prix utilisent un layout horizontal trop étroit — je passe à une disposition verticale (icône au-dessus du texte).


Le layout vertical Paper garde des marges d’icône problématiques — je crée un petit composant dédié pour Notes et Prix.


Corrigé sur l’écran de saisie des dimensions (pavé numérique).

Les boutons **Notes** et **Prix** utilisaient `MobileButton` avec icône et texte côte à côte dans un espace trop étroit — d’où le chevauchement.

### Correction
Nouveau composant **`PaveMetaButton`** :
- **Icône au-dessus** du libellé
- Espacement propre, sans les marges Paper qui provoquaient le chevauchement
- **Notes** en surbrillance (fond bleu clair) quand une note est saisie

Les libellés « Notes » et « Prix » restent lisibles et ne se superposent plus aux icônes.

---

**User**

apres attempte de nouvelle dimension, je me retrouve avec juste un metier. corrige, tout les metier doivent etre visible

---

**Cursor**

Le filtre ne gardait que les métiers ayant déjà des ouvrages pour l’entreprise — après une tentative, un seul métier restait visible. Je corrige pour afficher tout le catalogue.


La cause venait de `getMetiersForEntrepriseLocal` : dès qu’au moins un ouvrage existait pour l’entreprise, seuls les métiers **déjà liés à un ouvrage** étaient affichés.

Après une tentative de nouveau relevé (création d’un ouvrage sur un seul métier, par exemple), un seul métier restait visible.

### Correction
La fonction renvoie maintenant **tout le catalogue métiers** synchronisé depuis Supabase, sans filtre par ouvrages.

Les métiers sans ouvrage pour l’entreprise restent sélectionnables ; l’écran suivant indique déjà qu’il n’y a pas d’ouvrage (avec le bouton **+** pour les admins).

---

**User**

 Les ouvrage lors de nouveau releve en forme de liste centre, par ordre alphabetique, meme police que les boutons (metier)


---

**Cursor**

Je remplace les chips par des boutons comme pour les métiers : liste verticale centrée, tri alphabétique.


Les ouvrages du **nouveau relevé** utilisent maintenant le même format que les métiers.

### Changements
- **Chips** remplacés par des **`MobileButton`** en liste verticale (même police, même hauteur 64px)
- **Tri alphabétique** (A→Z, locale `fr`)
- **Liste centrée** : pleine largeur, texte centré dans chaque bouton
- **Sélection** : bouton orange plein quand l’ouvrage est sélectionné, sinon contour (comme les métiers)
- Nom du métier centré au-dessus de la liste

La section **Unité** (quand plusieurs unités) reste en chips, car ce n’est pas la liste des ouvrages.

---

**User**

 Le nom du metier aligne a gauche

---

**Cursor**

Le nom du métier sur l’écran de choix d’ouvrage est de nouveau **aligné à gauche**, comme le titre « Unité ».

---

**User**

- On clique sur n, meme comportement que l et h (efface automatiquement ce qui est la bas)

---

**Cursor**

Le champ `n` démarre à `'0'` au lieu de `''` comme `l` et `h`, donc la saisie s’ajoute au lieu d’effacer. Je corrige le comportement au clic.


Corrigé. Le champ **n** se comportait différemment de **l** et **h** :

- **l** / **h** : valeur initiale vide `''` → la saisie remplace l’affichage
- **n** : valeur initiale `'0'` → les chiffres s’ajoutaient (`05`, `012`…)

### Correction
1. **Clic sur n** (ou l/h) → le champ est **vidé** avant la nouvelle saisie
2. **Valeur initiale de n** : `''` au lieu de `'0'`
3. **Après enregistrement** : `n` repart vide comme les autres cotes

Un clic sur **n** efface donc la valeur affichée, comme pour **l** et **h**.

---

**User**

- Augment police de l , h et n. Remplace par largeur, hauteur, quantité respectivement

---

**Cursor**

Les champs de saisie des cotes ont été mis à jour :

### Libellés
- **l** → **Largeur**
- **h** → **Hauteur**
- **n** → **Quantité**

### Polices
- Libellés : 12 → **16** (gras)
- Valeurs saisies : 17 → **22**
- Hauteur des cases : 42 → **60 px**

Les libellés longs tiennent dans la case grâce à `adjustsFontSizeToFit`, et la grille s’adapte mieux avec un espacement `gap` entre les champs.

---

**User**

Nombre au lieu de Quantité

---

**Cursor**

Le libellé du champ **n** affiche maintenant **Nombre** au lieu de **Quantité**.

---

**User**

Entrez les relevés au lieu de Entrez les Dimensions

---

**Cursor**

Le titre de l’écran de saisie affiche maintenant **Entrez les releves** au lieu de **Entrez les dimensions**.

---

**User**

Ne montre pas montant. Align Qté et prix a gauche (nombres)

---

**Cursor**

Modifications sur l’écran de saisie des relevés :

- **Montant** : ligne supprimée (plus affichée)
- **Qté** et **Prix** : valeurs alignées à **gauche** sous les boutons Notes et Prix

---

**User**

Align text dans les boutons Notes et PRix left

---

**Cursor**

Les boutons **Notes** et **Prix** ont maintenant un layout horizontal : icône à gauche, libellé aligné à gauche à côté (plus de texte centré sous l’icône).

---

**User**

Remplace le bouton enregistrer dans le pavé par Voir (list). Enleve le FAB bouton list (jaune)

---

**Cursor**

Je remplace « Enregistrer » par « Voir » dans la barre du bas sur l’écran de saisie, et je retire le FAB liste jaune.


Modifications sur l’écran **Entrez les releves** :

### Barre du bas
- **Enregistrer** → **Voir** (icône liste)
- Ouvre le **récapitulatif** (même action que l’ancien FAB jaune)
- Activé/désactivé selon les mêmes règles qu’avant (lignes saisies ou formulaire valide)

### FAB jaune liste
- **Supprimé**

### Autres étapes du flux
- **Récap** : le bouton reste **Enregistrer** pour finaliser
- **Client/chantier** : inchangé

Le FAB **+** orange reste seul à droite pour ajouter une ligne.

---

**User**

Les boutons Largeur, Hauteur et Nombre, On clique n efface pas cequi est la bas. Mais lorsque commence a ecrire, remplace ce qui est la bas


---

**Cursor**

Clic : conserver la valeur affichée ; première touche : remplacer au lieu d’effacer ou d’ajouter.


C’est en place dans `PaveSaisieOneHand.js` pour **Largeur**, **Hauteur** et **Nombre** :

1. **Clic sur le champ** — la valeur affichée reste ; seul le focus change.
2. **Première touche** — remplace toute la valeur du champ.
3. **Touches suivantes** — s’ajoutent à la valeur en cours.
4. **Effacer** — supprime le dernier caractère, puis la saisie continue en mode ajout.

J’ai aussi ajouté l’import `useRef` qui manquait pour que ce comportement fonctionne correctement.

---

**User**

Retour a la liste renomme en Retour aux chantiers

---

**Cursor**

Le libellé du bouton gauche sur l’écran détails chantier est maintenant **Retour aux chantiers** (à la place de « Retour a la liste ») dans `App.js`.

---

**User**

- Lors de la modification (dimensions), Annuler retourne au recapitulatif

---

**Cursor**

Je cherche où le flux de modification des dimensions et le bouton Annuler sont gérés.


J’adapte le bouton Annuler : en modification d’une ligne, il renverra au récapitulatif au lieu d’annuler tout le flux.


C’est en place.

Lors d’une **modification** d’une ligne (écran dimensions avec sous-titre « Modification »), le bouton **Annuler** :

- **retourne au récapitulatif** sans confirmation
- **abandonne** les changements non enregistrés (la ligne garde ses valeurs d’origine)

Dans les autres cas (nouveau relevé, choix métier/ouvrage, etc.), **Annuler** garde le comportement actuel : confirmation puis sortie du flux.

---

**User**

18. Dans les ecrans details (clients, ouvrage) dans Plus, changer Plus en Modifier. Enleve modifier FAB

---

**Cursor**

Je mets « Modifier » dans la barre du bas sur les écrans détail et je retire le FAB crayon côté client.


C’est en place sur les écrans détail **Clients** et **Ouvrages** dans le menu Plus.

**Barre du bas**
- Le bouton **Plus** devient **Modifier** (icône crayon, style orange)
- Il ne renvoie plus au menu Plus depuis ces écrans

**Détail client**
- Le FAB crayon a été retiré
- **Modifier** ouvre le formulaire d’édition (comme avant via le FAB)
- Le FAB **Supprimer** est conservé

**Détail ouvrage**
- Le libellé **Modifier** est affiché (il n’y avait pas de FAB crayon à retirer)
- La modification d’ouvrage n’est pas encore implémentée côté écran

---

**User**

Tous les boutons supprimer en gris

---

**Cursor**

Je passe tous les boutons Supprimer en gris (`#9CA3AF`), comme les autres petits FAB.


Tous les boutons **Supprimer** sont maintenant en gris (`#9CA3AF`), comme les autres petits FAB :

- **Détail client** — FAB supprimer
- **Récapitulatif** (flux dimensions) — FAB supprimer chantier
- **Admin web** — bouton Supprimer

Le bouton **Déconnexion** sur l’écran Plus reste rouge : ce n’est pas un bouton supprimer.

---

**User**

Lorsque modifier client enregistre, le modal reopen

---

**Cursor**

Le modal se rouvre parce que l’effet réagit aussi à la mise à jour de `client` après l’enregistrement, alors que `editRequestId` est encore le même. Je ne déclencherai l’ouverture que lorsque `editRequestId` change réellement.


Corrigé.

Le modal se rouvrait parce qu’après **Enregistrer**, la mise à jour du client relançait l’effet d’ouverture alors que `editRequestId` était toujours le même.

Désormais, le modal ne s’ouvre que lorsque **Modifier** est cliqué (nouveau `editRequestId`), pas après une sauvegarde.

---

**User**

@design.md (161-167) 

---

**Cursor**

Je consulte le design et les écrans liste chantiers / clients pour aligner les cartes sur ce format.


Les cartes suivent maintenant le format du design.

**Liste chantiers** (2 lignes)
- Ligne 1 : nom du chantier
- Ligne 2 : `Nom du client / téléphone 1` à gauche, badge statut en bas à droite sur la même ligne

**Liste clients** (1 ligne)
- `Nom du client / téléphone 1` sur une seule ligne
- Le téléphone 2 n’est plus affiché sur la carte (toujours cherchable via la recherche)

---

**User**

Ajoute la date et temps prise le en bas du badge en petite caractere

---

**Cursor**

J’ajoute la date/heure de prise depuis le relevé et je l’affiche sous le badge sur les cartes chantiers.


C’est en place sur les cartes **chantiers**.

- La date/heure de prise vient du relevé (`releves.cree_le`), joint dans `getChantiersWithClientLocal`.
- Sous le badge statut, en petit et gris : format `jj/mm/aaaa, hh:mm` (ex. `03/06/2026, 14:30`).
- Si le chantier n’a pas encore de relevé, rien n’est affiché sous le badge.

---

**User**

Travaille sur la page modifier de l ouvrage (Plus)

---

**Cursor**

J’explore le flux ouvrage dans Plus et ce qui existe déjà pour l’édition (écran détail, modales, requêtes).


Je mets en place la modification d’ouvrage : requêtes de mise à jour, modal d’édition et branchement du bouton Modifier.


La page **Modifier** ouvrage dans Plus est en place.

### Bouton Modifier (barre du bas)
Ouvre le formulaire d’édition, comme pour les clients.

### Formulaire (`OuvrageFormModal`)
- **Métier** — lecture seule
- **Nom de l’ouvrage** — modifiable
- **Pour chaque ouvrage-unité** — formule, unité et type en lecture seule ; **prix unitaire** modifiable

### Enregistrement
- Met à jour `ouvrages` et `ouvrage_unites` en local
- Marque `_synced = 0` pour la sync cloud
- Rafraîchit l’écran détail et la liste des ouvrages
- Le modal ne se rouvre pas après enregistrement (même logique que pour les clients)

### Fichiers touchés
- `src/components/terrain/OuvrageFormModal.js` — nouveau modal
- `src/db/querries.js` — `updateOuvrageLocal`
- `src/screens/OuvrageDetailsScreen.js` — branchement du modal
- `App.js` — bouton Modifier branché

---

**User**

Permettre de moifier l ouvrage unite (choix autre unite)

---

**Cursor**

J’ajoute le choix d’une autre unité dans le modal et la mise à jour de `unite_id` en base.


C’est en place. Dans le formulaire **Modifier l’ouvrage**, chaque ouvrage-unité propose maintenant un menu **Choisir l’unité** (comme à la création), avec le catalogue complet des unités.

**Comportement**
- Sélection d’une autre unité → mise à jour du type (dimension / unitaire) et des infos affichées
- Le **prix unitaire** reste modifiable
- À l’enregistrement, `unite_id` et `prix_unitaire` sont mis à jour en local, avec sync cloud (`_synced = 0`)

L’écran détail et la liste reflètent la nouvelle unité après enregistrement.

---

**User**

Ajoute le bouton supprimer dans details ouvrage

---

**Cursor**

J’implémente la suppression d’ouvrage (avec garde si utilisé dans des relevés) et le FAB gris sur l’écran détail.


Le bouton **Supprimer** est ajouté sur l’écran détail ouvrage.

**Interface**
- FAB gris en bas à droite (comme pour les clients)
- Confirmation avant suppression

**Comportement**
- Supprime l’ouvrage et ses ouvrages-unités en local
- Retour automatique à la liste des ouvrages
- Rafraîchissement de la liste

**Protection**
- Si l’ouvrage est déjà utilisé dans des relevés, la suppression est refusée avec un message d’erreur explicite

---

**User**

Enleve Unite. Garde juste le type 

---

**Cursor**

La ligne **Unité** a été retirée sur l’écran détail ouvrage et dans le formulaire de modification. Seul le **Type** (Dimension / Unitaire) reste affiché, avec la formule et le prix unitaire.

---

**User**

Dans creation ou Modification ouvrage, pour l unite montre juste le nom de l unite

---

**Cursor**

Dans la **création** (`AjouterOuvrageModal`) et la **modification** (`OuvrageFormModal`) d’un ouvrage, le sélecteur d’unité affiche maintenant uniquement le **nom** de l’unité (sans la formule entre parenthèses).

---

**User**

@prompts_3.md (79-88) 

---

**Cursor**

Je commence par le schéma et la couche de stockage des images (local / Supabase selon Pro ou Gratuit) ; les formulaires et pages détail viendront ensuite.


Je mets en place le schéma, le stockage local et la synchro cloud Pro pour logo et photos.


Infrastructure photo/logo en place (schéma + stockage), sans les formulaires UI pour l’instant.

### Colonnes ajoutées
| Table | Champs |
|-------|--------|
| `chantiers` | `photo_1`, `photo_2`, `photo_3` |
| `ligne_releves` | `photo` |
| `entreprises` | `logo` (déjà existant) |

Migrations : SQLite local (`localDb.js`), Supabase (`schema.sql` + `20260604120000_terrain_image_fields.sql`).

### Stockage fichiers (`terrainImageStorage.js`)
- Fichiers locaux : `documentDirectory/terrain-files/`
- Clés en base, ex. `chantiers/{id}/photo_1.jpg`, `ligne_releves/{id}/photo.jpg`, `entreprises/{id}/logo.jpg`
- **Gratuit** (`ind_pro = 0`) : enregistrement **local uniquement**
- **Pro** (`ind_pro = 1`) : local **+** bucket Supabase `terrain-files`

### API prête pour les écrans (plus tard)
- `setEntrepriseLogoLocal(entrepriseId, sourceUri)`
- `setChantierPhotoLocal(chantierId, 'photo_1' | 'photo_2' | 'photo_3', sourceUri)`
- `setLigneRelevePhotoLocal(ligneId, sourceUri)`
- `resolveTerrainImageUri(storageKey)` — URI locale pour affichage

### Sync Pro
- Avant push : upload des images en attente vers Supabase
- Après pull : téléchargement des images manquantes en local
- Métadonnées (clés photo/logo) incluses dans la sync SQLite existante

### Déploiement Supabase
Appliquer la migration :
```bash
supabase db push
```

Les formulaires et pages détail viendront ensuite, en s’appuyant sur ces helpers.

---

**User**

Sur le cloud (Pro), assure toi les entreprises et profils ont des dossiers separer pour le stockage des images. Logo dans le dossier de l entreprise. Les photos de chantiers et lignereleve sauvegarder dans le dossier profil du dossier entreprise.

---

**Cursor**

Je réorganise les chemins cloud : logo dans le dossier entreprise, photos chantier/ligne dans le dossier profil sous l’entreprise.


---

**User**

Sur le cloud (Pro), assure toi les entreprises et chantier ont des dossiers separer pour le stockage des images. Logo dans le dossier de l entreprise. Les photos de chantiers et lignereleve sauvegarder dans le dossier chantiers du dossier entreprise.

---

**Cursor**

Je réorganise les chemins cloud : logo dans `entreprises/{id}/`, photos chantier et lignes dans `entreprises/{id}/chantiers/`.


La structure cloud Pro (et les clés locales associées) est maintenant organisée ainsi :

### Dossier entreprise
- **Logo** : `entreprises/{entrepriseId}/logo.jpg`

### Dossier chantiers (sous l’entreprise)
- **Photos chantier** : `entreprises/{entrepriseId}/chantiers/{chantierId}/photo_1.jpg` (idem `photo_2`, `photo_3`)
- **Photos ligne relevé** : `entreprises/{entrepriseId}/chantiers/{chantierId}/ligne_releves/{ligneId}/photo.jpg`

Les helpers `setChantierPhotoLocal` et `setLigneRelevePhotoLocal` résolvent automatiquement l’`entrepriseId` (et le `chantierId` pour les lignes) via les jointures en base, pour construire le bon chemin avant l’upload Supabase.

