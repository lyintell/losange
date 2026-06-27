# Prompts for markdown
_Exported on 6/25/2026 at 18:50:45 GMT from Cursor (3.7.42)_

---

**User**

Ajoute un ordre pour les ouvrages aussi (par metier). Donc si un metier est selectionné, les ouvrages seront ordonné par rapport à l ordre. Dans liste ouvrage (mobile), similair a metier, permet a un admin de reordonner respectivement.

---

**Cursor**

J’examine comment l’ordre des métiers est géré, puis j’appliquerai le même modèle aux ouvrages par métier.


Je poursuis l’implémentation : colonne `ordre` sur les ouvrages, requêtes, sync et réordonnancement par métier sur mobile.


Je simplifie l'écran ouvrages : `FlatList` en recherche, glisser-déposer comme pour les métiers.


L’ordre des ouvrages par métier est en place. Voici ce qui a été fait :

### Schéma & sync
- Colonne `ordre` sur `ouvrages` (migration `20260624140000_ouvrages_ordre.sql`)
- Backfill initial par `(metier_id, entreprise_id)` selon le nom
- Mise à jour de `schema.sql`, `localDb.js`, `terrainSync.js` et `terrain-sync/index.ts`

### Requêtes (`querries.js`)
- **`getOuvragesByMetierAndEntreprise`** et **`getArticlesByMetierAndEntreprise`** : tri `ordre ASC, nom ASC` (utilisé à la prise de cotes)
- **`getOuvragesByEntrepriseLocal`** : inclut `ordre` pour l’admin
- **`saveOuvragesOrderLocal(entrepriseId, metierId, ouvrageIds)`** : persiste le réordonnancement
- **Création d’ouvrage** : `ordre = MAX + 1` dans le métier concerné

### UI mobile — `ListeOuvragesScreen`
- **Chips métier** en haut pour filtrer la liste
- **Glisser-déposer** (maintenir une ligne) pour réordonner les ouvrages/articles **du métier sélectionné**
- Case à cocher actif/inactif conservée
- La recherche désactive le drag et affiche tous les métiers

### Prise de cotes
- **`NouvelleDimensionScreen`** : tri par `ordre` puis par nom

### À faire côté infra
1. Appliquer la migration Supabase `20260624140000_ouvrages_ordre.sql`
2. Redéployer `terrain-sync`
3. Resynchroniser l’app mobile

---

**User**

Quels sont encore les restrictions du compte free?

---

**Cursor**

Voici l’état actuel des restrictions **compte gratuit** dans le code (`src/utils/freeTierLimits.js` et usages associés).

## Limites numériques

| Ressource | Limite |
|-----------|--------|
| **Clients** actifs | 10 max |
| **Chantiers** actifs | 10 max |
| **Métiers** à la prise de cotes | 3 premiers métiers **actifs** (selon l’ordre défini) |
| **Ouvrages** par métier | 10 max par métier (les **articles** ne comptent pas dans cette limite) |
| **Utilisateurs** | 1 seul (admin conservé lors d’un passage Pro → Gratuit) |

---

## Synchronisation cloud

- **Pas de sync des données métier** : clients, chantiers, relevés, lignes, ouvrages, articles, fournisseurs, photos… ne sont **ni poussés ni récupérés** depuis Supabase.
- Sync limitée à :
  - **entreprise** (nom, etc.)
  - **profils**
  - **métiers / unités** (catalogue de base au login)
- Pas de sync automatique en arrière-plan (réservée au Pro).
- Pas d’upload/téléchargement des **photos** vers le cloud.
- Un **admin gratuit** peut quand même lancer une sync manuelle, mais elle reste limitée au compte (pas aux données chantier).

---

## Fonctionnalités Pro indisponibles

- **TVA** sur les devis/factures (`ind_tva` forcé à 0).
- **Logo entreprise** (paramètres profil).
- **Rapports** (menu Plus).
- **Validation OK par ligne** sur un relevé (double-tap sur une ligne).
- **Export WhatsApp** depuis un chantier (téléchargement PDF reste possible).
- **Affichage TVA** dans les exports devis (`devisExport.js`).

---

## À la prise de cotes

- Seuls les **3 premiers métiers actifs** (dans l’ordre admin) apparaissent.
- Pour un métier choisi, seuls les **ouvrages/articles actifs**, dans **l’ordre défini**, sont proposés.
- Pas de limite free spécifique sur le **nombre d’articles** par métier (seuls les ouvrages `ind_article = 0` sont plafonnés à 10).

---

## Si passage Pro → Gratuit (downgrade)

Le système applique automatiquement les plafonds et supprime :
- clients/chantiers/ouvrages au-delà des limites (les plus récents sont conservés),
- profils supplémentaires (1 admin gardé),
- logo entreprise,
- photos chantier et photos de lignes,
- TVA.

---

En résumé : le gratuit fonctionne **en local** pour prendre des cotes, avec des **plafonds de volume** et **sans backup cloud multi-appareils**. Le Pro débloque surtout la **sync complète**, la **TVA**, le **logo**, les **rapports**, les **photos cloud** et quelques outils avancés (validation ligne, WhatsApp).

---

**User**

Les comptes gratuits n'ont pas acces au web, et ne peut pas ajouter de nouveau metier. Limite de 3 metier actif parmi les metiers par defaut.

---

**Cursor**

Je vais repérer où l’accès web et l’ajout de métiers sont gérés, puis appliquer les restrictions compte gratuit.


J’applique les restrictions : blocage web pour les comptes gratuits, interdiction d’ajouter des métiers, et limite à 3 métiers par défaut actifs.


Voici ce qui a été mis en place :

### Web admin — accès Pro uniquement
- Connexion refusée pour les comptes gratuits avec le message : *« Accès web réservé aux comptes Pro. Utilisez l’application mobile. »*
- Vérification aussi dans le **middleware** et les **layouts** (session invalidée si downgrade Pro → Gratuit)
- Le compte **Master** reste accessible

### Mobile — métiers (compte gratuit)
- **Pas d’ajout** de métier personnalisé (FAB « + » masqué, `insertMetierEntrepriseLocal` bloqué)
- **Liste métiers** : uniquement les métiers du **catalogue par défaut** (`ind_custom = 0`)
- **Prise de cotes** : max **3 métiers par défaut actifs** (selon l’ordre défini)
- **Activation** : impossible d’activer un 4ᵉ métier (message d’erreur explicite)

### Comportement Pro (inchangé)
- Accès web
- Métiers personnalisés + réordonnancement complet
- Tous les métiers actifs disponibles à la prise de cotes

---

**User**

@prompts.md (84-87) 

---

**Cursor**

Je m’appuie sur la structure Clients/Chantiers pour refondre Ouvrages et Articles en navigation Métiers → liste par métier.


Je crée la structure Métiers → Ouvrages/Articles sur le même modèle que Clients → Chantiers.


La navigation web reprend maintenant le même modèle que **Clients → Chantiers**.

### Structure des routes

**Métiers et ouvrages**
- `/ouvrages` — liste des métiers (avec nombre d’ouvrages)
- `/ouvrages/[metierId]` — ouvrages du métier
- `/ouvrages/[metierId]/ouvrages/[ouvrageId]` — fiche ouvrage

**Métiers et articles**
- `/articles` — liste des métiers (avec nombre d’articles)
- `/articles/[metierId]` — articles du métier
- `/articles/[metierId]/articles/[articleId]` — fiche article

### Navigation & fil d’Ariane
- Sidebar : **« Métiers et ouvrages »** et **« Métiers et articles »**
- Fil d’Ariane aligné sur le modèle clients/chantiers

### Composants ajoutés
- `lib/metiers/queries.js` — métiers entreprise + compteurs
- `components/metiers/` — liste métiers (recherche + tableau)
- `MetierOuvragesClient` / `MetierArticlesClient` — en-tête métier + liste filtrée (sans colonne métier)

### Comportement
- Ouvrages/articles triés par `ordre` puis nom
- Recherche adaptée au contexte (sans métier dans la liste par métier)
- Les anciennes URLs `/ouvrages/[id]` et `/articles/[id]` sont remplacées par la structure imbriquée ci-dessus

---

**User**

Ajoute metier entreprise dans MasterScreen

---

**Cursor**

J’ajoute `metiers_entreprise` au MasterScreen et au CRUD master, avec prise en charge de la clé composite.


`metiers_entreprise` est intégré au Master Admin. Voici ce qui a été fait :

### MasterScreen
- Nouvelle entrée **« Métiers entreprise »** dans le groupe *Données de l'entreprise*
- Schéma : `entreprise_id`, `metier_id`, `ordre`, `ind_actif`, `supprime_le`, timestamps, `_synced`
- Clé composite `(entreprise_id, metier_id)` gérée via un identifiant synthétique `entreprise_id::metier_id`
- Libellés liste : `Entreprise / Métier` + sous-titre ordre/actif
- En édition, les clés composite ne sont pas modifiables
- Schéma **Métiers** enrichi (`entreprise_id`, `supprime_le`, `_synced`) pour les métiers personnalisés

### Backend (`supabaseAdmin.js` + `master-admin-crud`)
- Table ajoutée au fetch / insert / update / delete
- Suppression logique via `supprime_le`
- Update/delete filtrés sur les deux colonnes de la clé primaire

Pense à **redéployer** la edge function `master-admin-crud` pour que les changements soient actifs en production.

---

**User**

update .gitgnore

---

**Cursor**

Adding Next.js/webapps build artifacts to the root `.gitignore` — the admin app’s nested ignore already covers `.next/`, but the root file should too for the monorepo.


`.gitignore` at the repo root now includes a section for the Next.js admin webapp:

```107:112:c:\Users\oumar\Documents\PROJECTS\MY_APPS\DEV\losange_NEW\.gitignore
# Web apps (Next.js — webapps/admin, etc.)
.next/
out/
.vercel/
next-env.d.ts
```

These patterns apply anywhere in the tree, so build output and deploy artifacts under `webapps/` stay out of git even if a nested app is missing its own ignore file. `webapps/admin/.gitignore` already had the same rules locally; the root file now covers the monorepo consistently.

Everything else (Expo, Supabase, env files, SQLite, IDE folders) was already in place.

---

**User**

@prompts.md (90-101) 

---

**Cursor**

Implementing the default métiers from the prompt. Exploring how métiers are defined and seeded in the codebase.


Implementing the 11 default métiers: migration, shared constants, and seeding for new and existing accounts.


Les 11 métiers par défaut du prompt sont maintenant définis partout dans la stack.

### Catalogue (ordre d’affichage)
1. Menuiserie alu  
2. Menuiserie métallique  
3. Vitrage et verre  
4. Gros oeuvres  
5. Peinture  
6. Carrélage  
7. Électricité et clim  
8. Courant faible  
9. Plomberie et sanitaire  
10. Étanchéité et toiture  
11. Divers  

### Fichiers ajoutés / modifiés

- **`src/utils/defaultMetiers.js`** — liste canonique avec IDs stables (`metier-menuiserie-alu`, etc.)
- **`supabase/migrations/20260624150000_default_metiers.sql`** — insère les métiers globaux, les lie à toutes les entreprises existantes, et ajoute un trigger sur `INSERT` dans `entreprises` pour les nouveaux comptes
- **`src/db/querries.js`** — seed local SQLite + ajout des liens manquants dans `metiers_entreprise` (même si l’entreprise en avait déjà d’autres)
- **`terrain-login`** et **`terrain-sync`** — garantissent les liens par défaut à chaque connexion / sync

### À faire côté Supabase
1. Appliquer la migration `20260624150000_default_metiers.sql`
2. Redéployer `terrain-login` et `terrain-sync`
3. Resynchroniser l’app mobile (ou se reconnecter)

Les comptes existants reçoivent les 11 métiers sans écraser leur ordre ou leurs métiers personnalisés déjà liés.

---

**User**

Failed to deploy edge function: Failed to bundle the function (reason: Module not found "file:///tmp/user_fn_cbjkuecorfuxythadckj_4508ec3d-97d0-43e3-9b7b-c11daee29df6_11/source/defaultMetiers.ts". at file:///tmp/user_fn_cbjkuecorfuxythadckj_4508ec3d-97d0-43e3-9b7b-c11daee29df6_11/source/index.ts:3:53).

---

**Cursor**

Supabase’s bundler isn’t picking up the sibling `defaultMetiers.ts` module. Inlining that logic into each function’s `index.ts` to match how this project deploys edge functions.


Inlining the default métiers logic into each function's `index.ts` — the Supabase Dashboard deploy only bundles that file.


Le déploiement via le Dashboard Supabase n’embarque que `index.ts` — le fichier séparé `defaultMetiers.ts` n’était pas inclus dans le bundle.

La logique des métiers par défaut est maintenant **inline** directement dans :
- `supabase/functions/terrain-login/index.ts`
- `supabase/functions/terrain-sync/index.ts`

Les fichiers `defaultMetiers.ts` ont été supprimés. Tu peux redéployer `terrain-login` (et `terrain-sync` si besoin) — l’erreur de module introuvable ne devrait plus apparaître.

**Note :** si tu déploies depuis le Dashboard en collant le code, colle bien tout le contenu de `index.ts` mis à jour. Avec la CLI (`supabase functions deploy terrain-login`), le fichier complet est envoyé automatiquement.

---

**User**

the webapp should be in .gitignore. It will be it's own deployment through a different git repo. Or what do you think? what is the best way to structure this

---

**Cursor**

Reviewing the repo layout and `.gitignore` to recommend a structure.


**Short answer:** don’t put `webapps/` in `.gitignore`. That folder is source code, not build output. Ignoring it would hide it from git while you still edit it locally — messy and easy to lose sync with mobile and Supabase.

---

## What `.gitignore` is for vs. what you want

| Goal | Right tool |
|------|------------|
| Ignore `.next/`, `node_modules/`, `.env` | `.gitignore` |
| Deploy admin on its own (Vercel, etc.) | Separate **deploy config**, same repo is fine |
| Admin in a completely separate git history | **Separate repo** (or submodule), not ignore |

---

## Recommended structure for Losange (solo/small team)

**Keep one monorepo** for now:

```
losange_NEW/
├── src/                    # mobile Expo
├── supabase/               # schema, migrations, edge functions
├── webapps/admin/          # Next.js admin
└── prompts/
```

**Why this fits your project:**

1. **Shared backend** — migrations, edge functions, and admin UI often change together (e.g. `metiers_entreprise`, default métiers).
2. **Duplicated business logic** — you already mirror things like `formatLigneMesures`, `releveFacturation`, `chantierStatusFromReleves` under `webapps/admin/lib/`. Split repos make that drift worse unless you extract a shared package.
3. **One person, one product** — monorepo = one PR, one history, easier for Cursor/agents.

**Deploy admin separately without splitting git:**

- **Vercel:** project root = `webapps/admin`, build = `npm run build`
- **GitHub Actions:** workflow with `working-directory: webapps/admin`
- Mobile (EAS) and Supabase deploy from the same repo with different paths

That gives separate deployments without separate repos.

---

## When a separate repo makes sense

Consider splitting only if:

- A different team owns admin only
- Different release cadence (admin weekly, mobile monthly)
- Different access control on GitHub

**Then do a real split**, not `.gitignore`:

1. Create `losange-admin` repo with `webapps/admin` contents at root.
2. Remove `webapps/` from the mobile repo in one commit.
3. Optionally add `packages/losange-shared` (or a private npm package) for duplicated utils.

**Avoid git submodules** unless you really need two remotes — they’re painful for day-to-day work.

---

## If you split later: reduce duplication first

Extract shared logic into something like:

```
packages/shared/
  formatLigneMesures.js
  releveFacturation.js
  defaultMetiers.js
  ...
```

Mobile and admin would both import from `@losange/shared`. Until then, staying in one repo is simpler than maintaining two copies in two repos.

---

## Practical recommendation

| Approach | Verdict |
|----------|---------|
| Monorepo + deploy `webapps/admin` as subfolder | **Best for you now** |
| `webapps/` in `.gitignore` | **Avoid** |
| Separate repo now | Only if you need separate team/access |
| `packages/shared` | Good **after** admin stabilizes |

I’d keep `webapps/admin` tracked in this repo and point Vercel (or similar) at `webapps/admin`. No `.gitignore` change needed beyond what you already have for `.next/` and env files.

If you want to proceed, I can either:
1. Add a short `webapps/admin/README.md` with Vercel deploy steps, or  
2. Plan a clean split into `losange-admin` with a list of files to move.

---

**User**

Okay. Now I want you to redeploy my master screen in production

---

**Cursor**

Exploring how the Master Screen is built and deployed to production.


---

**User**

redeploy my master screen (losange-master.expo.app)

---

**Cursor**

Checking the EAS/Expo hosting setup for `losange-master.expo.app`.


Deployment created; alias assignment failed due to a network error. Retrying.


**Master Screen redeployed successfully.**

| | |
|---|---|
| **Production URL** | https://losange-master.expo.app |
| **Dashboard** | [EAS Hosting deployments](https://expo.dev/projects/a1f60592-4a9f-4fc6-8209-1d8b8f7879ee/hosting/deployments) |

Steps run:
1. `npx expo export --platform web` → `dist/` (uses `App.web.js` + latest `MasterScreen`)
2. `eas deploy --prod --alias losange-master`

The first deploy attempt created the build but failed on alias assignment (`ECONNRESET`); the retry completed and promoted to production.

Hard-refresh the page (Ctrl+Shift+R) if you still see the old version. If CRUD or new tables don’t work, also redeploy `master-admin-crud` on Supabase — that’s separate from this frontend deploy.

---

**User**

Dans l ecran admin, metier ouvrage et metier article sont vide. Affiche les metiers meme si il n y a pas d article ou ouvrage (count 0).

---

**Cursor**

Les listes métiers sont probablement filtrées quand le count est 0 — je regarde comment les requêtes et l’affichage sont faits dans l’admin.


Les listes vides viennent probablement de `metiers_entreprise` non peuplé — j’ajoute un repli sur les métiers globaux et je garde l’affichage même avec count 0.


Corrigé dans `webapps/admin/lib/metiers/queries.js`.

**Cause :** la liste ne venait que de `metiers_entreprise`. Si cette table était vide pour l’entreprise (migration pas encore appliquée ou pas de liens), la page affichait « Aucun métier trouvé » — même avec des métiers globaux en base et 0 ouvrage/article.

**Changements :**
1. **Auto-liaison** des 11 métiers par défaut dans `metiers_entreprise` à l’ouverture de la page (comme sur mobile).
2. **Repli** : si aucun lien, chargement direct des métiers globaux + personnalisés depuis `metiers`.
3. **Compteur** : `item_count` peut être `0` — les métiers restent affichés.
4. **Détail métier** : `fetchMetierById` fonctionne aussi sans entrée dans `metiers_entreprise`.

Recharge les pages **Métiers et ouvrages** et **Métiers et articles** — tu devrais voir les 11 métiers avec `0` dans la colonne Ouvrages/Articles.

Si la liste est toujours vide, applique la migration `20260624150000_default_metiers.sql` sur Supabase pour créer les métiers globaux.

---

**User**

Non. La liste doit etre celui de la base seulement. Rien de dur

---

**Cursor**

Suppression du code en dur : la liste viendra uniquement de Supabase, avec affichage des métiers même si count = 0.


C’est corrigé : plus rien en dur côté web admin.

La liste vient **uniquement** de `metiers_entreprise` (jointure `metiers`), triée par `ordre`. Le compteur ouvrages/articles est informatif seulement — un métier avec **0** reste affiché.

`defaultMetiers.js` et l’auto-insert des métiers par défaut ont été retirés.

Si la liste est encore vide, c’est un problème de **données** dans Supabase, pas de filtre UI :
1. Appliquer la migration `20260624150000_default_metiers.sql`
2. Se reconnecter sur mobile (ou lancer un sync) pour remplir `metiers_entreprise` pour l’entreprise

Tu peux vérifier dans le SQL Editor :

```sql
SELECT * FROM metiers_entreprise WHERE entreprise_id = 'TON_ENTREPRISE_ID';
```

---

**User**

Lorsque un compte est cree, est ce que les metiers par defaut auront des id? je vois des metiers par defaut ou leur id sont metier-electricite-clim (eg).

---

**Cursor**

Vérifiant comment les IDs des métiers par défaut sont définis à la création d'un compte.


Oui — c’est **volontaire** et **normal**.

## Comment ça fonctionne

Les métiers par défaut ne sont **pas** créés par entreprise avec un nouvel UUID. Il existe **11 lignes globales** dans la table `metiers`, partagées par tous les comptes :

| Champ | Valeur |
|--------|--------|
| `id` | identifiant fixe, ex. `metier-electricite-clim` |
| `entreprise_id` | `NULL` (catalogue global) |
| `nom` | ex. « Électricité et clim » |

Quand une **entreprise est créée**, le trigger `trg_seed_metiers_entreprise` n’insère pas de nouveaux métiers : il crée des **liens** dans `metiers_entreprise` :

```
entreprise_id  →  metier_id (ex. metier-electricite-clim)
```

Toutes les entreprises pointent donc vers les **mêmes** IDs pour le catalogue par défaut.

## Deux types d’IDs

| Type | Format | Exemple |
|------|--------|---------|
| **Métier par défaut** | slug stable | `metier-electricite-clim` |
| **Métier personnalisé** (ajouté par l’admin mobile) | UUID | `a3f2b1c4-...` |

Les métiers custom sont créés avec `uuidv4()` dans `insertMetierEntrepriseLocal`, avec `entreprise_id` renseigné.

## Pourquoi des slugs et pas des UUID ?

- Même référence partout (mobile, web, sync, migrations)
- La migration `20260624150000_default_metiers.sql` peut faire `ON CONFLICT (id) DO UPDATE`
- Pas de doublons « Électricité » avec des IDs différents par entreprise

## Ce que tu vois dans l’admin

Dans le Master Screen, l’`id` affiché pour un métier par défaut sera bien `metier-electricite-clim` — ce n’est pas une erreur, c’est la clé primaire en base.

Si tu avais d’**anciens** métiers créés avant cette migration (souvent en UUID), ils peuvent coexister avec les nouveaux slugs. Dans ce cas, les ouvrages liés aux anciens IDs restent sur les anciennes lignes ; la migration ajoute les 11 nouveaux sans les supprimer automatiquement.

En résumé : **oui, les métiers par défaut ont des IDs** — des slugs fixes en base, pas des UUID générés à chaque création de compte.

---

**User**

Ok. Mais dans web admin, je dois voir les metier par defaut. Ce qui n est pas le cas maintenant. Est ce par ce la table ne pull metier_id que si uuid?

---

**Cursor**

Vérifiant si un filtre UUID ou un problème de jointure empêche l'affichage des métiers par défaut dans l'admin web.


Pas de filtre UUID dans le code. Probable cause : la jointure Supabase `metiers (...)` renvoie `null` alors que `metiers_entreprise` contient bien les slugs. Je corrige en chargeant les métiers en deux requêtes séparées.


**Non, ce n’est pas un filtre UUID.** Les IDs en slug (`metier-electricite-clim`) sont des `TEXT` valides — le code ne distingue pas slug et UUID.

## Pourquoi la liste était vide

La requête utilisait une jointure Supabase imbriquée :

```sql
metiers_entreprise → metiers (...)
```

Si cette jointure renvoie `null` (souvent avec des IDs slug), chaque ligne était ignorée ici :

```javascript
if (!metier?.id || metier.supprime_le) return null;
```

Résultat : des lignes dans `metiers_entreprise`, mais **0 métier affiché**.

## Correction appliquée

Chargement en **2 requêtes** (toujours 100 % base de données) :
1. `metiers_entreprise` → `metier_id`, `ordre`, `ind_actif`
2. `metiers` → `.in('id', [...])` (slug ou UUID)

Recharge la page admin — les métiers par défaut devraient apparaître avec count `0` si besoin.

## Si c’est encore vide

Vérifie dans Supabase que les **liens** existent pour ton entreprise :

```sql
SELECT me.metier_id, m.nom
FROM metiers_entreprise me
LEFT JOIN metiers m ON m.id = me.metier_id
WHERE me.entreprise_id = 'TON_ENTREPRISE_ID'
  AND me.supprime_le IS NULL
ORDER BY me.ordre;
```

- **0 lignes** → migration `20260624150000_default_metiers.sql` pas appliquée, ou entreprise créée avant le trigger → reconnecte-toi (terrain-login crée les liens) ou exécute la migration.
- **Lignes avec `nom` NULL** → les slugs dans `metiers_entreprise` ne matchent pas des lignes dans `metiers` → réappliquer la migration des métiers globaux.

---

**User**

Metier ouvrage et metier article, contienne la liste des metiers d abord. Meme si le metier n a pas de ouvrage ou article, affiche le. Ceci doit aussi etre le cas pour client (client sans chantier doit etre sur la liste)

---

**Cursor**

Vérifiant les requêtes clients et métiers pour confirmer qu'aucun filtre n'exclut les entrées avec count 0.


Les métiers sont déjà corrects. Le bug clients : `fetchClientsList` ne chargeait que les clients ayant au moins un chantier — je corrige ça.


**Clients — corrigé**

`fetchClientsList` ne chargeait que les clients qui avaient **au moins un chantier** (via `.in('id', clientIds)` dérivé des chantiers). Un client sans chantier n’apparaissait jamais.

Maintenant :
- tous les clients de l’entreprise viennent de la table `clients`
- `chantier_count` et `devis_total` peuvent être **0**

---

**Métiers et ouvrages / Métiers et articles — déjà conforme**

La logique actuelle :
1. lit tous les liens `metiers_entreprise` de l’entreprise
2. charge les métiers correspondants (slug ou UUID)
3. affiche `item_count: 0` si aucun ouvrage/article

Aucun filtre sur le count.

Si la liste métiers est encore vide, c’est un problème de **données** (`metiers_entreprise` vide ou `metier_id` sans ligne dans `metiers`). Vérifie avec :

```sql
SELECT me.metier_id, m.nom
FROM metiers_entreprise me
LEFT JOIN metiers m ON m.id = me.metier_id
WHERE me.entreprise_id = 'TON_ENTREPRISE_ID'
  AND me.supprime_le IS NULL;
```

Recharge l’admin après redémarrage du serveur dev si besoin.

---

**User**

Voici le resultat du querry. Enleve metier et article. Renomm metier et ouvrage comme, Métiers, ouvrages, articles. Dans la liste, on voit d'abord la liste des métiers (y compris ceux avec 0 articles et ouvrages). Affiche le nombre d'ouvrage et d'article aussi. On clique, affiche la liste des ouvrages et des articles (2 tabs comme liste de devis et liste des releves). Adopte exactement le meme layout que Clients et chantiers (breadcrumbs, details metier et modifier bouton, etc). Sur clique de un ouvrage (ou article), affiche le details en modal (modifiable directement)

---

**Cursor**

Refonte de la section métiers selon le layout Clients/Chantiers. Exploration de la structure actuelle.


Mise en place de la section unifiée sur le modèle Clients/Chantiers.


Refonte de la section catalogue admin terminée, sur le modèle **Clients et chantiers**.

### Navigation
- Menu **« Métiers et articles »** supprimé
- **« Métiers et ouvrages »** renommé en **« Métiers, ouvrages, articles »** (`/ouvrages`)
- Les anciennes URLs `/articles/...` redirigent vers `/ouvrages/...`

### Liste des métiers (`/ouvrages`)
- Tous les métiers de `metiers_entreprise` (y compris **0 ouvrage / 0 article**)
- Colonnes : **Métier · Ouvrages · Articles**

### Détail métier (`/ouvrages/[metierId]`)
- Même structure que client → chantiers :
  - En-tête avec nom du métier + bouton **Modifier** (modal détails)
  - **2 onglets** : Les ouvrages | Les articles
  - Breadcrumbs dynamiques selon l’onglet actif
- Clic sur une ligne → **modal d’édition** (`OuvrageEditModal` / `ArticleEditModal`), sans page séparée

### Données
- Toujours **100 % base** (`metiers_entreprise` + `metiers` + comptage `ouvrages`)
- Pas de liste en dur

Recharge l’admin : tu devrais voir tes 11 métiers par défaut + « test ly », avec les comptes à 0 quand il n’y a pas encore d’ouvrages/articles.

La liste est vide malgré des données en base — j’enquête sur la session, les requêtes et les politiques RLS.


Vous avez raison sur la redondance : je vais cartographier l’usage actuel de `metiers` / `metiers_entreprise`, puis proposer un modèle où chaque métier appartient directement à une entreprise (UUID à la création).


---

**User**

@prompts.md (104-106) 

---

**Cursor**

Je vais lire le contexte dans `prompts.md` et repérer où brancher ces deux indicateurs (connexion mobile admin et présélection des métiers).


Je mets en place le modèle simplifié : deux indicateurs sur `entreprises`, métiers liés directement à l’entreprise, et popup de présélection au premier login admin mobile.


---

**User**

j ai discard les change, je te redonne les instruction. Procede etape par etape

---

**Cursor**

Je repars de zéro : je lis d’abord les instructions dans `prompts.md` et l’état actuel du code.


Étape 1 — migration BDD : ajout des deux indicateurs sur `entreprises` et des colonnes nécessaires sur `metiers`.


---

**User**

J ai undo certain changements recent. Je te redonne des instructions

---

**Cursor**

Je vérifie l’état actuel du dépôt après vos annulations, puis je relis les instructions dans `prompts.md`.


État actuel : code d’origine (pas de migration `20260624170000`). On commence par l’**étape 1** : schéma BDD pour les points 17–18.


Étape 1 terminée. Passage à l’étape 2 : `terrain-login` — marquer la connexion admin mobile et ne plus auto-lier `metiers_entreprise`.


---

**User**

updated @prompts/web/prompts.md . run @prompts.md (104-111) 

---

**Cursor**

Je lis `prompts.md` et l’état du code, puis j’implémente les points 17–18 étape par étape.


Je mets en place les étapes 1 à 5.


Implémentation des points **17–18** terminée. Résumé par étape :

## Étape 1 — Base de données
- Migration `supabase/migrations/20260624170000_entreprise_onboarding_metiers.sql`
- `entreprises` : `ind_admin_connecte_mobile`, `ind_metiers_preselectionnes`
- `metiers` : `ordre`, `ind_actif`, `ind_default`
- Backfill : `ind_metiers_preselectionnes = 1` si l’entreprise a déjà des métiers (ancien ou nouveau modèle)
- `schema.sql` aligné

## Étape 2 — Backend (Edge Functions)
- **`terrain-login`** : `source: 'mobile'` → passe `ind_admin_connecte_mobile` à 1 pour les admins ; métiers lus via `metiers.entreprise_id` uniquement (plus de catalogue global / `metiers_entreprise`)
- **`terrain-sync`** : action `preselect_metiers` → crée les métiers (UUID) + passe `ind_metiers_preselectionnes` à 1 ; free max 3, pro max 11

## Étape 3 — Mobile (données)
- `defaultMetiers.js` → gabarits (`templateKey`) sans IDs partagés en BDD
- `querries.js` → métiers par `entreprise_id`, plus d’auto-seed `metiers_entreprise`
- `localDb.js` → colonnes SQLite ajoutées

## Étape 4 — Mobile (UX)
- **`PreselectionMetiersModal`** : cases à cocher sur les 11 métiers par défaut
- **`App.js`** : à la 1ʳᵉ connexion admin, popup bloquante avant l’écran chantiers
- **`terrainAuth.js`** : envoie `source: 'mobile'`, retourne `needsMetierPreselection`

## Étape 5 — Web admin
- `webapps/admin/lib/metiers/queries.js` → liste directe depuis `metiers` où `entreprise_id = ?`

---

### À faire côté Supabase
1. Appliquer la migration `20260624170000_entreprise_onboarding_metiers.sql`
2. Redéployer **`terrain-login`** et **`terrain-sync`**

### Flux admin mobile
1. Connexion → `ind_admin_connecte_mobile = 1`
2. Si `ind_metiers_preselectionnes = 0` → popup de sélection (max 3 en free)
3. Validation → métiers créés en BDD avec UUID → `ind_metiers_preselectionnes = 1` → accès chantiers

Le web admin **ne** déclenche **pas** `ind_admin_connecte_mobile` (pas de `source: 'mobile'`).

Souhaitez-vous enchaîner sur le **point 15** (paramètres entreprise dans le web admin) ?

---

**User**

Quel table est utilise maintenant metier ou metier_entreprise ou les deux?

---

**Cursor**

Je vérifie dans le code actuel quelle table est lue/écrite pour les métiers.


C’est **`metiers` uniquement** pour le nouveau modèle (prompt 18). **`metiers_entreprise` n’est plus la table de référence**, mais elle existe encore dans le schéma pour la transition.

## Modèle cible (nouveau)

| Rôle | Table |
|------|--------|
| Métiers d’une entreprise | **`metiers`** avec `entreprise_id` |
| Présélection admin mobile | Insertion dans **`metiers`** (UUID par entreprise) |
| Login / sync Supabase | Lecture **`metiers`** où `entreprise_id = ?` |
| Web admin catalogue | Lecture **`metiers`** où `entreprise_id = ?` |

Chaque ligne de `metiers` appartient à une entreprise :
- `entreprise_id` — lien entreprise ↔ métier  
- `ordre`, `ind_actif`, `ind_default` — ordre, actif, gabarit par défaut ou personnalisé  

Plus de métiers globaux partagés (`entreprise_id = NULL`) ni de table de liaison pour le flux normal.

## `metiers_entreprise` — encore présente, mais legacy

La table **n’a pas été supprimée**. Elle reste pour :

1. **Comptes / données anciennes** — migration `20260624150000` + données déjà en prod  
2. **Fallback mobile** — si une entreprise n’a **aucun** métier dans `metiers.entreprise_id`, le mobile retombe encore sur `metiers` ⋈ `metiers_entreprise`  
3. **Sync / Master** — `terrainSync.js`, `terrainSyncPro.js`, `MasterScreen` connaissent encore la table  

Les edge functions renvoient désormais `metiers_entreprise: []` au pull ; elles ne créent plus de liens automatiques.

## En pratique

| Situation | Table utilisée |
|-----------|----------------|
| Nouvelle entreprise après présélection admin | **`metiers` seulement** |
| Web admin `/ouvrages` | **`metiers` seulement** |
| Ancienne entreprise non migrée | **`metiers` + `metiers_entreprise`** (fallback) |

**Conclusion :** le modèle officiel est **`metiers` seul** (`entreprise_id` obligatoire). `metiers_entreprise` est **dépréciée** et sera retirable une fois les anciennes données migrées et le code legacy nettoyé.

Si tu veux, on peut faire l’étape suivante : migration des anciennes lignes `metiers_entreprise` → `metiers` + suppression de la table.

---

**User**

Je vais flush supabase pour reset toute les donnees

---

**Cursor**

Avant le reset, je vérifie l’ordre des migrations et ce qui pourrait entrer en conflit avec le nouveau modèle `metiers` seul.


Tu peux repartir sur une base propre. Voici ce qui compte pour que le reset colle au **nouveau modèle** (`metiers` seul + présélection admin).

## Après le flush Supabase

1. **Recréer le schéma** — soit `supabase db reset` (toutes les migrations), soit exécuter `supabase/schema.sql` puis les migrations dans l’ordre.

2. **Redéployer les edge functions** (obligatoire après reset) :
   - `terrain-login`
   - `terrain-sync`
   - `master-admin-crud` (si tu utilises le Master)

3. **Côté mobile** — effacer aussi les données locales SQLite (désinstaller/réinstaller l’app, ou vider les données de l’app), sinon d’anciens métiers / `metiers_entreprise` restent en cache.

4. **Web admin** — se reconnecter ; les métiers n’apparaîtront qu’**après** la présélection admin mobile (ou création manuelle en BDD).

---

## Point d’attention : migration `20260624150000_default_metiers.sql`

Elle est **en conflit** avec le prompt 18. Si tu la réappliques telle quelle après flush, elle va :

- insérer 11 métiers **globaux** (`entreprise_id = NULL`, ids `metier-…`)
- remplir **`metiers_entreprise`** pour toutes les entreprises
- recréer un **trigger** qui lie automatiquement les métiers à chaque nouvelle entreprise

Conséquences :
- `ind_metiers_preselectionnes` passera à **1** tout de suite (backfill de `20260624170000`)
- le **popup de présélection** ne s’affichera **pas**
- le web admin restera vide (il lit `metiers` où `entreprise_id = ?`, pas `metiers_entreprise`)

Pour un reset aligné avec le nouveau flux, il faudrait **neutraliser ou remplacer** `20260624150000` (supprimer le seed global + le trigger, garder seulement les gabarits dans le code mobile).

---

## État attendu après reset (nouveau modèle)

| Table | Contenu |
|--------|---------|
| `metiers` | Vide au départ ; remplie à la validation du popup admin |
| `metiers_entreprise` | Vide (table legacy, plus utilisée par le flux normal) |
| `entreprises` | `ind_admin_connecte_mobile = 0`, `ind_metiers_preselectionnes = 0` |

---

## Checklist rapide

```
[ ] Flush Supabase
[ ] Migrations appliquées (sans l’ancien auto-seed si possible)
[ ] terrain-login + terrain-sync redéployés
[ ] Données locales mobile effacées
[ ] Créer une entreprise de test + connexion admin mobile → popup métiers
```

Si tu veux, je peux **modifier `20260624150000`** pour qu’elle soit compatible avec le reset (suppression du seed global et du trigger) avant que tu flushes.

---

**User**

oui modifie

---

**Cursor**

Je neutralise la migration `20260624150000` pour qu’elle soit compatible avec le nouveau modèle (plus de seed global ni de trigger).


`20260624150000_default_metiers.sql` est alignée avec le nouveau modèle.

**Avant** : seed de 11 métiers globaux, remplissage de `metiers_entreprise`, trigger à chaque création d’entreprise.

**Maintenant** :
- suppression du trigger `trg_seed_metiers_entreprise` et de la fonction associée
- nettoyage des anciennes données (`metier-*` globaux + liaisons `metiers_entreprise`) si l’ancienne migration avait déjà tourné
- **aucun insert** en base — les gabarits restent uniquement dans `src/utils/defaultMetiers.js`

J’ai aussi ajusté `20260624170000` : le backfill de `ind_metiers_preselectionnes` ne regarde plus que `metiers.entreprise_id` (plus `metiers_entreprise`).

Après ton flush Supabase :
1. Réappliquer toutes les migrations (ou `supabase db reset`)
2. Redéployer `terrain-login` et `terrain-sync`
3. Vider les données locales mobile
4. Créer une entreprise → 1ʳᵉ connexion admin mobile → popup de présélection

---

**User**

comment flush

---

**Cursor**

Tu as un projet Supabase **cloud** (`cbjkuecorfuxythadckj`). Voici les options, de la plus simple à la plus manuelle.

## Option A — CLI (recommandée si le projet est lié)

À la racine du repo :

```bash
supabase login
supabase link --project-ref cbjkuecorfuxythadckj
```

Puis **reset complet** (efface toutes les données + réapplique les migrations) :

```bash
supabase db reset --linked
```

Ensuite pousser le schéma si besoin :

```bash
supabase db push
```

Redéployer les fonctions :

```bash
supabase functions deploy terrain-login
supabase functions deploy terrain-sync
supabase functions deploy master-admin-crud
supabase functions deploy master-admin-login
supabase functions deploy master-admin-verify
supabase functions deploy terrain-change-password
```

> `--linked` est **destructif** : toutes les données du projet distant sont supprimées.

---

## Option B — Dashboard Supabase (sans CLI)

1. Ouvre [supabase.com](https://supabase.com) → ton projet → **SQL Editor**
2. Exécute un script de vidage (ordre respectant les clés étrangères) :

```sql
TRUNCATE TABLE
  ligne_releves,
  releves,
  chantiers,
  clients,
  ouvrage_unites,
  ouvrages,
  article_unites,
  articles,
  fournisseurs,
  metiers_entreprise,
  metiers,
  profils,
  entreprises,
  unites
RESTART IDENTITY CASCADE;
```

3. Si des tables manquent dans la liste, adapte selon ton schéma.
4. Réapplique les migrations : **Database → Migrations** ou `supabase db push` depuis ta machine.

Si tu avais créé le schéma initial via `supabase/schema.sql` (et pas seulement les migrations), réexécute aussi ce fichier dans le SQL Editor après le truncate.

---

## Option C — Dev local uniquement (Docker Supabase)

```bash
supabase db reset
```

Ça ne touche **pas** le projet cloud.

---

## Après le flush (dans tous les cas)

| Étape | Action |
|--------|--------|
| 1 | Migrations à jour (`20260624150000` nettoyée + `20260624170000`) |
| 2 | Edge functions redéployées |
| 3 | Secrets Supabase toujours présents (`MASTER_ADMIN_*`, etc.) |
| 4 | **Mobile** : vider SQLite (désinstaller l’app ou effacer les données) |
| 5 | Recréer une entreprise + profil admin via Master |
| 6 | 1ʳᵉ connexion admin **mobile** → popup présélection métiers |

---

## Vérification rapide

Après reset, dans le SQL Editor :

```sql
SELECT COUNT(*) FROM metiers;           -- 0
SELECT COUNT(*) FROM metiers_entreprise;  -- 0
SELECT COUNT(*) FROM entreprises;       -- 0 (ou tes données de test)
```

Les métiers n’apparaîtront qu’après la **présélection admin mobile**, pas à la création d’entreprise.

Tu préfères passer par la **CLI** ou le **Dashboard** ? Je peux t’aider étape par étape selon ton choix.

---

**User**

J ai choisi option B, j ai run schema.sql. Est ce la peine les migrations?

---

**Cursor**

Je compare `schema.sql` et les migrations pour voir ce qui manque si tu n’appliques que le schéma.


**Non, pas besoin de toutes les migrations** si tu viens de faire un flush + `schema.sql` complet à jour.

`schema.sql` contient déjà l’essentiel du projet actuel :
- tables principales (`entreprises`, `profils`, `metiers`, `ouvrages`, `relevés`, etc.)
- colonnes **prompt 17–18** (`ind_admin_connecte_mobile`, `ind_metiers_preselectionnes`, `ordre`, `ind_actif`, `ind_default` sur `metiers`)
- bucket `terrain-files`
- politiques RLS `anon` sur les tables listées dans le script

## Ce que les migrations ajoutent en plus (souvent inutile après `schema.sql`)

| Migration | Utile après `schema.sql` ? |
|-----------|----------------------------|
| `20260624150000` | **Oui, en partie** — supprime l’ancien trigger `trg_seed_metiers_entreprise` (le TRUNCATE ne l’enlève pas) |
| `20260624170000` | Non — colonnes déjà dans `schema.sql` |
| `20260624120000` | Non — tables/index déjà couverts |
| `20260619120000` (`articles`, `article_unites`) | Non — l’app utilise `ouvrages` avec `ind_article = 1` |
| Autres anciennes | Non si `schema.sql` est à jour |

## À faire quand même (1 script court)

Dans le **SQL Editor**, exécute le contenu actuel de `20260624150000_default_metiers.sql` :

```sql
DROP TRIGGER IF EXISTS trg_seed_metiers_entreprise ON entreprises;
DROP FUNCTION IF EXISTS seed_metiers_entreprise_for_entreprise();

DELETE FROM metiers_entreprise
WHERE metier_id IN (
  SELECT id FROM metiers WHERE entreprise_id IS NULL
);

DELETE FROM metiers
WHERE entreprise_id IS NULL AND id LIKE 'metier-%';
```

Ça évite qu’un **ancien trigger** recrée des liens `metiers_entreprise` à chaque nouvelle entreprise.

## Ensuite

1. Redéployer `terrain-login` et `terrain-sync`
2. Vider les données **mobile** (SQLite local)
3. Créer entreprise + admin via Master
4. 1ʳᵉ connexion admin **mobile** → popup métiers

**En résumé :** `schema.sql` suffit pour le schéma ; lance seulement le petit script de nettoyage ci-dessus, pas toute la pile de migrations. Les migrations restent utiles plus tard si tu passes à `supabase db push` / `db reset` en CLI pour versionner l’historique.

---

**User**

je peux supprimer metiers_entreprise?

---

**Cursor**

Je vérifie où `metiers_entreprise` est encore référencée dans le code avant de te dire si tu peux la supprimer.


**Oui, sur Supabase tu peux la supprimer** — surtout après ton flush et avec le nouveau modèle (`metiers.entreprise_id`).

## Sur Supabase (maintenant)

Si la table est **vide** (ton cas après reset) :

```sql
DROP TABLE IF EXISTS metiers_entreprise CASCADE;
```

Rien ne casse côté flux normal :
- login / sync lisent les métiers via **`metiers`** uniquement
- web admin lit **`metiers`** où `entreprise_id = ?`
- présélection admin écrit dans **`metiers`**

## Ce qui reste dans le code (sans bloquer)

La table est encore **mentionnée** mais plus utilisée comme source de vérité :

| Endroit | Impact si table supprimée en BDD |
|---------|----------------------------------|
| `schema.sql` | La recréerait si tu le réexécutes tel quel |
| SQLite mobile (`localDb.js`) | Table locale vide — pas grave |
| `querries.js` | Fallback legacy seulement si la table **existe** localement |
| `terrain-sync` / sync mobile | Renvoie `metiers_entreprise: []` |
| Master Screen | Affiche encore l’onglet (inutile) |

Donc : **DROP en prod = OK**. Ce n’est pas encore un nettoyage complet du repo.

## Ce que je ne ferais pas (pour l’instant)

- Supprimer **uniquement** en BDD **sans** retirer `CREATE TABLE metiers_entreprise` de `schema.sql` → au prochain `schema.sql`, elle revient.
- Supprimer le code legacy tout de suite **sans** besoin — optionnel, pas urgent.

## Recommandation

1. **Maintenant** : `DROP TABLE metiers_entreprise` sur Supabase  
2. **Plus tard** (quand tu veux) : retirer la table de `schema.sql`, `localDb.js`, sync et Master — je peux faire ce nettoyage en une passe si tu veux.

**En bref :** oui, tu peux la supprimer en base ; le nouveau flux ne dépend plus d’elle. Garde juste en tête que `schema.sql` la recréerait tant qu’on ne l’en a pas retirée.

---

**User**

retire le de @supabase/schema.sql . Je reflush et relance @supabase/schema.sql 

---

**Cursor**

C’est fait dans `supabase/schema.sql` :

- suppression du `CREATE TABLE metiers_entreprise`
- retrait de `metiers_entreprise` du bloc RLS
- ajout de `DROP TABLE IF EXISTS metiers_entreprise CASCADE;` pour que le script enlève l’ancienne table si elle existe encore

**Ordre pour ton reflush :**

1. TRUNCATE (ou flush) des données  
2. Exécuter tout `schema.sql` d’un coup  
3. (Optionnel) le petit script de `20260624150000` pour supprimer l’ancien trigger s’il existait encore  
4. Redéployer `terrain-login` + `terrain-sync`  
5. Vider les données locales mobile

---

**User**

Edge Function returned a non-2xx status code dans losange-master

---

**Cursor**

Je trace quel Edge Function le Master appelle et pourquoi il renvoie une erreur non-2xx.


Probable cause : `master-admin-crud` interroge encore `metiers_entreprise`, table supprimée. Je retire cette référence du Master et des edge functions.


**Cause probable :** après suppression de `metiers_entreprise`, `master-admin-crud` faisait encore un `SELECT *` sur cette table au chargement du Master → **500** → message générique « non-2xx ».

**Corrections faites :**
- `master-admin-crud` — retrait de `metiers_entreprise`
- `supabaseAdmin.js` + `MasterScreen.js` — alignés (onglet Métiers avec `ordre`, `ind_actif`, `ind_default`)

## À faire maintenant

**1. Redéployer `master-admin-crud`** (obligatoire — le code sur Supabase est encore l’ancien) :

```bash
npx supabase login
npx supabase link --project-ref cbjkuecorfuxythadckj
npx supabase functions deploy master-admin-crud
```

Ou via le **Dashboard Supabase** → Edge Functions → `master-admin-crud` → Deploy (avec `index.ts` + `entrepriseTier.ts`).

**2. Vérifier les secrets Master** (Dashboard → Edge Functions → Secrets) :
- `MASTER_ADMIN_IDENTIFIANT`
- `MASTER_ADMIN_PASSWORD`
- `MASTER_SESSION_SECRET`

**3. Verify JWT = OFF** sur `master-admin-login`, `master-admin-verify`, `master-admin-crud`.

**4. Recharger losange-master** (Ctrl+R) et se reconnecter avec Y62L.

---

Si l’erreur persiste **à la connexion** (avant le chargement des tables), c’est plutôt `master-admin-login` (secrets manquants ou JWT activé). Si c’est **après connexion**, c’était bien `master-admin-crud` — le redéploiement devrait suffire.

---

**User**

supprime toute reference à metier_entreprise, article, article_unite si ces tables sont encore referencer quelque part

---

**Cursor**

Poursuivant le nettoyage des références aux tables supprimées.


Appliquant les modifications dans tous les fichiers concernés.


Le nettoyage est terminé. Voici ce qui a changé :

### `metiers_entreprise` — supprimé partout dans le code actif

| Fichier | Action |
|---------|--------|
| `src/db/querries.js` | Suppression du fallback legacy (join), ordre/actif/retrait via `metiers` uniquement |
| `src/db/localDb.js` | Table retirée du schéma initial ; migration `DROP TABLE metiers_entreprise` + `ind_actif` sur `metiers` |
| `src/db/terrainSync.js` | Colonnes sync mises à jour, plus de push/pull junction |
| `src/db/terrainSyncMerge.js` | `metiers` en merge transactionnel, `unites` seul en catalogue |
| `src/db/terrainSyncPro.js` | Retiré du push/sync |
| `supabase/functions/terrain-login` | Payload sans `metiers_entreprise` |
| `supabase/functions/terrain-sync` | Retiré de `PUSH_ORDER`, `TABLE_COLUMNS`, upsert et filtres push |

### `articles` / `article_unites` (tables SQL)

- **Conservé** : `migrateArticlesIntoOuvrages()` dans `localDb.js` — migration one-shot pour les anciennes bases SQLite mobiles (copie vers `ouvrages` puis `DROP`).
- **Non touché** : l’admin web (`lib/articles/`, routes `/articles`) — UI « articles » sur `ouvrages` avec `ind_article = 1`, pas sur une table SQL `articles`.
- **Migrations historiques** (`20260619120000`, etc.) laissées telles quelles pour l’historique Git.

### À faire côté déploiement

Redéployer les edge functions modifiées :
```bash
npx supabase functions deploy terrain-login
npx supabase functions deploy terrain-sync
```

Au prochain lancement mobile, la table locale `metiers_entreprise` sera supprimée automatiquement si elle existait encore.

