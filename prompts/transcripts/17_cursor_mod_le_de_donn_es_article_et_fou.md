# Champ fournisseur et recherche simplifiée
_Exported on 6/19/2026 at 16:11:06 GMT from Cursor (3.8.11)_

---

**User**

Je n aime pas le champs fournisseur. J ai dit c est un seul champ nom du fournisseur (pas de telephone) qui agit comme un search bar aussi, pas de search bar separer. si des fournisseurs match le nom ou le numero de telephone 1 ou 2, alors affiche les dans un drop down. Si non, alors un nouveau fournisseur avec le nom entrée est cree automatiquement 

---

**Cursor**

Je vais examiner l’implémentation actuelle du champ fournisseur pour le remplacer par un seul champ nom avec recherche intégrée et création automatique.


Je fusionne recherche et saisie en un seul champ « Nom du fournisseur », avec liste déroulante des correspondances et création automatique à l’enregistrement.


Le champ fournisseur du modal « Nouvel article » a été simplifié comme demandé.

**Ce qui change :**
- Un seul champ **« Nom du fournisseur »** — plus de barre de recherche séparée, plus de champ téléphone
- À la saisie, recherche automatique (nom, téléphone 1 ou 2) avec liste déroulante sous le champ
- Sélection dans la liste → le fournisseur existant est utilisé (téléphones affichés en sous-titre si présents)
- Pas de sélection → à la création de l’article, un nouveau fournisseur est créé avec le nom saisi uniquement (sans téléphone)

**Comportement :**
1. Tapez un nom ou un numéro → les correspondances apparaissent en dessous
2. Touchez une ligne pour sélectionner un fournisseur existant
3. Ou laissez le texte tel quel et validez « Créer » → nouveau fournisseur + article

---

**User**

Dans selection article (et entree des dim), montre le nom du fournisseur entre parenthese 

---

**Cursor**

Je cherche où les articles sont affichés dans la sélection et la saisie des dimensions pour y ajouter le nom du fournisseur entre parenthèses.


Je mets à jour la requête articles pour inclure le fournisseur, j’ajoute un helper d’affichage, puis j’adapte l’écran de sélection et la saisie des dimensions.


Le nom du fournisseur s’affiche maintenant entre parenthèses pour les articles.

**Où :**
- **Liste de sélection** (mode article) : `Ciment 42.5 (Bamako Matériaux)`
- **Écran de saisie des dimensions** : même format dans le titre en haut

**Technique :**
- `getArticlesByMetierAndEntreprise` joint la table `fournisseurs` pour récupérer `fournisseur_nom`
- Helper `formatArticleNomAvecFournisseur` dans `formatLigneMesures.js`
- À la création d’un article, l’objet `ouvrage` transmis au flux inclut aussi `fournisseur_nom` (correction du bug `result.article` → `result.ouvrage`)

Si un article n’a pas de fournisseur, seul le nom de l’article est affiché.

---

**User**

Dans les modal nouvel ouvrages, articles, permettre de scroll jusqu en bas.

---

**Cursor**

Je corrige le défilement : `AjouterOuvrageModal` n’a pas de `ScrollView`, et dans les deux modals le contenu dépasse sans contrainte de hauteur.


Les deux modals permettent maintenant de défiler jusqu’en bas.

**Corrections :**
- **`AjouterOuvrageModal`** : ajout d’un `ScrollView` (il n’y en avait pas)
- **Les deux modals** : hauteur max contrainte (`85 %` de l’écran) pour que le scroll fonctionne vraiment
- Padding déplacé dans le contenu scrollable + `paddingBottom: 48` pour que les boutons Annuler / Créer restent accessibles
- Indicateur de scroll vertical activé

Quand le clavier est ouvert ou que la liste fournisseur s’affiche, tu peux faire défiler jusqu’aux boutons du bas.

---

**User**

fournisseur n est pas obligatoire pour article. un nouvel article peut etre cree sans fournisseur

---

**Cursor**

Je rends le fournisseur optionnel dans le modal et dans la couche base de données.


Le fournisseur est maintenant optionnel à la création d’un article.

**Modal « Nouvel article »**
- Le champ est libellé « Nom du fournisseur (optionnel) »
- Le bouton Créer ne demande plus de fournisseur
- Si un nom est saisi, le comportement existant reste : recherche, sélection ou création automatique

**Base locale**
- Suppression de l’erreur « Fournisseur requis pour un article »
- Un article peut être enregistré avec `fournisseur_id` à `NULL`
- Un fournisseur n’est créé que si un nom est effectivement saisi

Sans fournisseur, l’article s’affiche simplement sans parenthèses dans la liste et à la saisie des dimensions.

---

**User**

deplace fournisseur en bas de prix unitaire

---

**Cursor**

Dans le modal « Nouvel article », l’ordre des champs est maintenant :

1. Métier  
2. Article (nom, unité, prix unitaire)  
3. Fournisseur (optionnel)  
4. Boutons Annuler / Créer

---

**User**

J ai supprimer un article dans master ecran, mais il continue d exister dans l app (local) meme si supprime le a ete populer

---

**Cursor**

Je vais tracer comment la suppression côté master admin est synchronisée vers la base locale et pourquoi les articles supprimés restent visibles.


Le pull sync excluait les lignes avec `supprime_le` : la suppression côté master n’arrivait jamais en local. J’inclus les tombstones dans le pull et je renforce la fusion côté client.


**Cause :** la sync ne téléchargeait que les enregistrements actifs (`supprime_le IS NULL`). Quand tu supprimais un article dans l’écran master, `supprime_le` était bien rempli côté Supabase, mais l’app locale ne recevait jamais cette mise à jour — elle gardait l’ancienne version sans date de suppression.

**Corrections :**

1. **`terrain-sync` et `terrain-login`** — le pull inclut maintenant aussi les lignes supprimées (ouvrages, ouvrage_unites, fournisseurs, clients, etc.), pour propager les tombstones vers le téléphone.

2. **`terrainSyncMerge.js`** — si le serveur envoie une suppression et que la copie locale est encore active, la suppression distante est appliquée dès que `mis_a_jour_le` serveur est ≥ local.

**Pour que ça prenne effet :**
1. Redéployer les edge functions `terrain-sync` et `terrain-login` sur Supabase.
2. Sur l’app, lancer une synchronisation (ou se reconnecter).

Après sync, l’article disparaîtra de la liste : les requêtes locales filtrent déjà `supprime_le IS NULL`.

---

**User**

Remplacer choix de l ouvrage par Choix de l'ouvrage / article

---

**Cursor**

Le sous-titre de l’étape de sélection affiche maintenant **« Choix de l'ouvrage / article »** dans `NouvelleDimensionScreen.js`.

---

**User**

Dans PDF releve, ind_dimension = 1, alors affiche l unite (formule avec espace entre lettres). Pas toujour lxhxn. Ex. si lxhxe, alors l x h x e x n

---

**Cursor**

Le PDF relevé affiche maintenant la formule réelle de l’unité pour `ind_dimension = 1`, au lieu du libellé fixe `l x h x n`.

**Exemples :**
- `lxh` → `Fenêtre (l x h x n)`
- `lxhxe` → `Dalle (l x h x e x n)`
- `l*h*p` → `Mur (l x h x p x n)`

**Modifications :**
- Nouveau helper `formatFormuleDimensionLabel` — lit les lettres de la formule (`l`, `h`, `p`, `e`) dans l’ordre, les sépare par ` x `, puis ajoute ` x n`
- `getLignesByChantierLocal` charge aussi `u.formule` pour alimenter le PDF
- Le groupement PDF relevé/devis transmet la formule à l’affichage

Regénère un PDF relevé pour voir le changement sur les lignes dimensionnelles.

---

**User**

Si lxhxe est l unite, dans modifier, e ne reconduit pas le chiffre

---

**Cursor**

Je vais suivre le flux de modification d’une ligne pour voir pourquoi l’épaisseur (`e`) n’est pas rechargée pour l’unité `lxhxe`.


L’épaisseur (`profondeur`) n’était pas passée aux valeurs initiales du pavé en mode modification.


**Cause :** en modification, `initialValues` du pavé reprenait largeur, hauteur et nombre, mais pas `profondeur` (épaisseur / `e` dans `lxhxe`).

**Correction :** ajout de `profondeur: editingLigne.profondeur` dans `NouvelleDimensionScreen.js`.

En rouvrant une ligne `lxhxe`, le champ Épaisseur doit maintenant être prérempli avec la valeur enregistrée.

---

**User**

13. Dans devis, n affiche pas le libelle de l unite dans la designation (ex. lxhxn, u)

---

**Cursor**

Dans le devis, la désignation n’affichera plus que le nom de l’ouvrage — sans formule ni unité entre parenthèses.


Dans le **devis PDF**, la colonne Désignation affiche désormais uniquement le **nom de l’ouvrage** — sans `(l x h x n)`, `(u)`, `(m2)`, etc.

Le **PDF relevé** conserve l’affichage de la formule entre parenthèses. La colonne quantité du devis garde l’unité (ex. `5 m2`) si elle y était déjà.

---

**User**

@prompts_4.md (39-41) 

---

**Cursor**

Je vais lire l’export PDF relevé/devis et le formatage des lignes pour appliquer les règles `ind_dimension = 1` et `nom_unite ≠ u`.


J’implémente les helpers de formule et j’adapte le formatage PDF relevé et devis selon `ind_dimension = 1` et `nom_unite ≠ u`.


Règle appliquée pour `ind_dimension = 1` et `nom_unite ≠ u` :

### PDF relevé
Après les cotes, ajout de l’équivalence unité :
- `120 x 80 x 3 = lxh m2`
- `120 x 80 x 10 x 3 = lxhxe m2`

Si `nom_unite = u`, rien n’est ajouté (comportement inchangé).

### Devis
- **Désignation** : formule compacte sous le nom de l’ouvrage (`lxh`, `lxhxe`…) — plus les cotes chiffrées
- **Quantité** : quantité totale calculée (`formule × n`) avec libellé, ex. `4,80 lxhxn m2` ou `2,40 lxhxen m2`

Les unités en `u` gardent l’affichage précédent.

---

**User**

Non. quand je dis formule, c est la formule. ex. lxh veut dire largeur x hauteur numerique

---

**Cursor**

Tu as raison : la formule, c’est le calcul numérique (largeur × hauteur…), pas le texte « lxh ». Je corrige l’affichage PDF relevé et devis en ce sens.


J’évite une dépendance circulaire en inlinant la détection des cotes de la formule.


Correction appliquée : la **formule**, c’est le calcul sur les cotes numériques, pas le texte `lxh`.

### PDF relevé (`nom_unite ≠ u`)
- Cotes : `120 x 80 x 10 x 3`
- Puis le **résultat calculé** : `= 9,60 m2` (quantité réelle × unité)

### Devis (`nom_unite ≠ u`)
- **Désignation** : cotes de la formule sans `n` — ex. `120 x 80` pour `lxh`, `120 x 80 x 10` pour `lxhxe`
- **Quantité** : total calculé + unité — ex. `9,60 m2`

Si `nom_unite = u`, le comportement reste inchangé.

---

**User**

 Ajoute un champ remise a la table releve.

---

**Cursor**

J’ajoute le champ `remise` à la table `releve` : schéma Supabase, base locale et synchronisation.


Champ `remise` ajouté sur la table `releves` :

**Supabase**
- Migration `supabase/migrations/20260619160000_releves_remise.sql`
- `supabase/schema.sql` : `remise DOUBLE PRECISION NOT NULL DEFAULT 0`

**SQLite locale**
- Colonne dans le schéma de création
- Migration `ALTER TABLE` pour les bases existantes

**Sync & admin**
- `terrainSync.js` et `terrain-sync/index.ts` : colonne incluse dans la sync
- `AdminScreen.js` : champ éditable dans l’écran master (défaut `0`)

Les nouveaux relevés auront `remise = 0` par défaut. Pense à appliquer la migration Supabase et à redéployer `terrain-sync` si besoin.

La logique métier (pourcentage vs montant, impact sur le devis) n’est pas encore branchée — dis-moi comment tu veux l’utiliser et on l’ajoutera.

---

**User**

Dans l enregistrement client et chantier (user A et S seulement), affiche le champ remise en bas (apres photo 3).

---

**Cursor**

Je cherche les écrans d’enregistrement client/chantier et les règles d’accès pour les rôles A et S.


J'implémente le champ remise dans le formulaire client/chantier et la persistance sur le relevé.


Le champ **remise** est en place sur l’écran d’enregistrement client/chantier.

### UI (`ClientChantierFormScreen.js`)
- Champ **Remise** affiché **après la photo 3**, uniquement pour les rôles **A** et **S** (`canEditReleveRemise`)
- Saisie numérique (virgule ou point acceptés)
- En modification d’un chantier existant, la valeur est préremplie depuis le relevé

### Persistance (`querries.js`)
- `insertReleveLocal` accepte `remise` à la création
- `updateReleveRemiseLocal` pour la mise à jour
- `finalizeDimensionDraftLocal` enregistre la remise si elle est fournie (sinon inchangée pour C/T)

### Flux édition (`App.js` + `mockData.js`)
- À l’ouverture d’un chantier en modification, la remise du relevé est chargée dans le brouillon

Les utilisateurs **C** et **T** ne voient pas le champ ; leur remise reste à **0** (ou à la valeur existante en édition).

---

**User**

@design.md (199-200) 

---

**Cursor**

Je vais examiner l'écran client/chantier et le composant photo pour appliquer l'affichage compact sur une seule ligne.


Je crée un composant compact pour les 3 photos sur une ligne, avec aperçu au clic comme dans les détails.


Les photos chantier sont maintenant compactes sur l’écran client/chantier.

### Nouveau composant `ChantierPhotosCompactRow.js`
- Les **3 emplacements** sont sur **une seule ligne** (hauteur ~52 px au lieu de 120 px chacun)
- **Vide** : icône appareil → ouvre le sélecteur pour ajouter
- **Rempli** : icône image (comme dans les détails) → ouvre la photo en modal
- Dans la modal : **aperçu**, **téléchargement** et **suppression** (comme `ChantierDetails`)

### `ClientChantierFormScreen.js`
- Remplace les 3 grands `TerrainPhotoInput` empilés par la rangée compacte

Le comportement d’enregistrement (brouillon, sync, suppression) reste inchangé.

---

**User**

@prompts_4.md (46-47) 

---

**Cursor**

Je vais m’appuyer sur le pattern fournisseur et les requêtes client/chantier existantes pour refondre les champs nom client et nom chantier.


Je refonds les champs client et chantier sur le modèle fournisseur, et j’ajoute la recherche de chantiers par client.


Je corrige la logique : en édition, la saisie ne doit plus effacer client/chantier ; la recherche chantier reste limitée au client sélectionné.


Les champs client et chantier suivent maintenant le même pattern que le fournisseur.

### Nom du client
- **Un seul champ** : saisie + recherche (nom ou téléphone)
- Dropdown sous le champ pendant la frappe
- Sélection → remplit nom et téléphone
- Nouveau nom sans sélection → création d’un nouveau client à l’enregistrement

### Nom du chantier
- **Même pattern** : saisie + dropdown
- Recherche **uniquement parmi les chantiers du client sélectionné** (`searchChantiersByClientLocal`)
- Sélection → préremplit nom, adresse, notes, photos et lie le relevé existant
- Nouveau nom sans sélection → nouveau chantier (ou mise à jour si édition en cours)

### Autres
- Suppression de la `Searchbar` séparée
- `App.js` : prise en charge de `chantierId` / `releveId` depuis le payload (sélection d’un chantier existant)
- En **édition**, modifier le nom ne réinitialise plus les données client/chantier déjà chargées

---

**User**

@c:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\1.txt:550-553 

---

**Cursor**

Je vais tracer la suppression de chantier et la gestion SQLite pour identifier la cause du verrouillage.


La cause probable : `ensureSchemaMigrations` s'exécute à chaque accès DB et entre en conflit avec les transactions. Je corrige ça et j'ajoute WAL + `busy_timeout`.


**Cause :** `ensureLocalDatabaseReady()` relançait les migrations SQL (`execAsync`) à **chaque** accès DB. Pendant une suppression ou une sync, une autre opération (liste chantiers, sync auto…) pouvait déclencher ces migrations en parallèle → `database is locked`.

### Corrections (`localDb.js`)
1. **Migrations une seule fois** au démarrage (dans `initLocalDatabase`), plus à chaque requête
2. **`PRAGMA journal_mode = WAL`** et **`busy_timeout = 5000`** pour mieux gérer les accès concurrents
3. **`runWithLocalDatabase()`** — file d’attente pour sérialiser les écritures/transactions

### Opérations protégées
- `deleteChantierLocal`
- `finalizeDimensionDraftLocal` (enregistrement client/chantier)
- Transactions de sync dans `terrainSyncPro.js`

Recharge l’app (reload Metro) puis réessaie la suppression d’un chantier. Si l’erreur revient, dis-le moi avec le moment exact (pendant sync, juste après login, etc.).

---

**User**

Lorsque j essaie d acceder aux chantiers sur l ecran web, AH Snap

---

**Cursor**

Le crash `STATUS_ILLEGAL_INSTRUCTION` sur le web pointe souvent vers SQLite ou du code natif — je vais suivre le flux « chantiers » côté web.


Le bundle web charge encore `expo-sqlite` et les écrans mobiles via `App.js`, ce qui peut provoquer le crash WASM `STATUS_ILLEGAL_INSTRUCTION`. Je vais isoler l'entrée web.


Le crash **Aw, Snap! / STATUS_ILLEGAL_INSTRUCTION** venait très probablement du bundle web qui chargeait encore **expo-sqlite** (WASM) et toute la couche mobile via `App.js`, alors que l’admin web n’utilise que Supabase.

### Corrections

1. **`App.web.js`** — entrée web dédiée : login master + `AdminScreen` uniquement (pas de SQLite terrain, pas d’écrans mobiles).

2. **`metro.config.js`** — `expo-sqlite` est exclu du build web.

3. **`localDb.web.js`** — stub SQLite complété (`withTransactionAsync`, `tableHasColumn`).

4. **`terrainImageStorage.web.js`** — version web sans dépendance à `terrainSync` / SQLite (clés photos + upload admin Supabase).

### À faire de ton côté

Redémarre Metro **en vidant le cache** :

```bash
npx expo start --web --clear
```

Puis recharge la page (Ctrl+Shift+R) et réessaie l’onglet **Chantiers** dans l’admin.

Si le crash persiste, indique-moi ton navigateur (Chrome/Edge/Firefox) et si ça arrive uniquement sur Chantiers ou aussi sur Clients.

---

**User**

Dans la base de donnes (menu PLUS), ajoute les articles parmi les ouvrage. presentement je ne vois pas les articles. Met a jour le formulaire pour l ind_article et autres

---

**Cursor**

Je vais examiner l'écran Base de données et la gestion des ouvrages/articles pour inclure les articles et mettre à jour le formulaire.


Je mets à jour les requêtes et les écrans Base de données pour inclure les articles et le formulaire associé.


Les articles (`ind_article = 1`) apparaissent maintenant dans la base de données du menu Plus.

### Liste (`ListeOuvragesScreen`)
- Titre : **Ouvrages / Articles**
- Affiche **ouvrages et articles** (filtre `ind_article` retiré)
- Badge **Article** / **Ouvrage** sur chaque ligne
- Nom article avec fournisseur : `Nom (Fournisseur)`
- Recherche étendue au fournisseur

### Détails (`OuvrageDetailsScreen`)
- Type (Article / Ouvrage)
- Fournisseur pour les articles
- Libellés adaptés (suppression, unités)

### Formulaire (`OuvrageFormModal`)
- Type affiché en lecture seule
- **Article** : champ fournisseur (recherche + création auto comme à la saisie terrain)
- Libellés et titres adaptés selon le type

### Données (`querries.js`)
- `getOuvragesByEntrepriseLocal` : inclut articles + `fournisseur_nom`
- `getOuvrageByIdLocal` : joint le fournisseur
- `updateOuvrageLocal` : met à jour le fournisseur des articles

### Menu Plus (`DatabaseScreen`)
- Bouton renommé **Ouvrages / Articles**

Synchronise si besoin pour voir les articles créés sur d’autres appareils.

---

**User**

Montre moi comment les unites fonctionne au niveau du PU, affichage PDF, affichage Devis

---

**Cursor**

Je vais parcourir le code qui lie unités, prix unitaire, PDF et devis pour te donner une vue claire.


Voici comment les **unités** pilotent le P.U, le **PDF relevé** et le **devis** dans Losange.

---

## 1. Modèle unité (catalogue)

Chaque unité (`unites`) a :

| Champ | Rôle |
|--------|------|
| `formule` | Formule de calcul : `lxh`, `lxhxe`, `u`, etc. |
| `nom_unite` | Unité résultat : `m2`, `ml`, `u`, … |
| `ind_dimension` | **0** = unitaire · **1** = dimension (cotes L/H/épaisseur) |

Affichage au choix : `lxh (m2)` si `ind_dimension = 1`, sinon le nom seul (`formatUniteChoiceLabel`).

---

## 2. Deux prix unitaires

| Prix | Où | Rôle |
|------|-----|------|
| **P.U catalogue** | `ouvrage_unites.prix_unitaire` | Référence catalogue |
| **P.U appliqué** | `ligne_releves.prix_unitaire_applique` | Prix utilisé partout (terrain, devis, montant) — modifiable sur le pavé |

---

## 3. Calculs selon `ind_dimension`

Logique dans `ligneReleveCalcul.js` :

### A) Unitaire — `ind_dimension = 0` (ex. pièce `u`)

```
quantité     = n
P.U appliqué = P.U catalogue (par défaut)
montant      = P.U appliqué × n
```

**Ex.** 10 pièces à 5 000 F → quantité `10`, montant `50 000 F`.

### B) Dimension — `ind_dimension = 1` (ex. `lxh` → `m2`)

Cotes en **cm**, converties en **m** pour le calcul.

```
facteur      = eval(formule)     ex. l×h = 1,20 × 0,80 = 0,96 m²
quantité     = facteur × n       ex. 0,96 × 10 = 9,60 m²
P.U appliqué = P.U catalogue × facteur   ex. 5 000 × 0,96 = 4 800 F
montant      = P.U appliqué × n         ex. 4 800 × 10 = 48 000 F
```

Équivalent : **montant = P.U catalogue × quantité**.

---

## 4. Cas particulier : `nom_unite = "u"` avec `ind_dimension = 1`

Même avec une formule (`lxh`), si `nom_unite` vaut **`u`**, on ne traite pas la ligne comme une « formule dérivée » (`shouldAfficherFormuleDerivee` = false).

Comportement proche d’un ouvrage unitaire avec cotes, sans afficher `= X m2`.

---

## 5. Affichage terrain (détails chantier, pavé)

| `ind_dimension` | Quantité affichée | P.U affiché | Montant |
|-----------------|-------------------|-------------|---------|
| 0 | `n` | P.U appliqué | P.U × n |
| 1 | `n` (pas la quantité m²) | P.U appliqué | P.U × n |

La **quantité calculée** (`quantite` en base) sert aux exports ; à l’écran on montre surtout **n** pour les lignes dimension.

---

## 6. PDF relevé (dimensions, sans prix)

Structure par ligne (`buildRelevesTableRows` → `buildDimensionsPdfHtml`) :

```
[Métier]
Nom ouvrage (l x h x n)     ← titre avec formule si ind_dimension=1
120 x 80 x 10 = 9,60 m2     ← cotes + équivalence si nom_unite ≠ u
→ note optionnelle
```

| Type | Titre ouvrage | Ligne mesures |
|------|---------------|---------------|
| Dimension `m2` | `Carrelage (l x h x n)` | `120 x 80 x 10` + `= 9,60 m2` |
| Dimension `u` | `Seuil (l x h x n)` | `120 x 80 x 10` (pas d’équivalence) |
| Unitaire | `Vis (u)` | `10` (nombre seul) |

---

## 7. PDF devis (avec prix)

Colonnes : **Désignation · Quantité · P.U · Montant**

### Désignation

- **Métier** (1ère ligne du groupe)
- **Nom ouvrage** seul (sans `(lxh)` ni `(m2)`)
- **Ligne cotes** (si `ind_dimension = 1` uniquement) :

| Cas | Ligne cotes |
|-----|-------------|
| `nom_unite ≠ u` | Cotes **sans n** : `120 x 80` |
| `nom_unite = u` | Toutes les cotes : `120 x 80 x 10` |
| `ind_dimension = 0` | Pas de ligne cotes |

### Quantité

| Cas | Colonne quantité |
|-----|------------------|
| `ind_dimension = 1` et `nom_unite ≠ u` | Total calculé + unité : `9,60 m2` |
| `ind_dimension = 1` et `nom_unite = u` | `n` : `10 u` |
| `ind_dimension = 0` | `n` + unité : `10 u` |

### P.U et montant

- **P.U** = toujours `prix_unitaire_applique`
- **Montant** = `P.U appliqué × n` (pas `quantité × P.U catalogue` directement, mais le résultat est cohérent)

---

## 8. Schéma récapitulatif

```
                    ┌─────────────────────────────────────┐
                    │         Unité catalogue             │
                    │  formule + nom_unite + ind_dimension│
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
      ind_dimension = 0                               ind_dimension = 1
      (unitaire)                                      (dimension)
              │                                               │
    quantité = n                          quantité = formule(l,h,e)×n
    PU défaut = PU catalogue              PU défaut = PU catalogue × formule
    montant = PU × n                      montant = PU × n
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                    ligne_releves.prix_unitaire_applique
                    (éditable sur le pavé)
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
         PDF RELEVÉ                                      PDF DEVIS
    cotes + = qty unité                          désignation + qty + PU + montant
    pas de prix                                  prix visibles
```

---

## 9. Exemples concrets

**Carrelage** — `lxh (m2)`, P.U catalogue 5 000 F/m², 120×80 cm, n=10 :

| | Valeur |
|---|--------|
| quantité | 9,60 m² |
| P.U appliqué (défaut) | 4 800 F |
| montant | 48 000 F |
| PDF relevé | `120 x 80 x 10 = 9,60 m2` |
| Devis désignation | `Carrelage` + `120 x 80` |
| Devis quantité | `9,60 m2` |

**Vis** — `u`, `ind_dimension=0`, P.U 100 F, n=50 :

| | Valeur |
|---|--------|
| quantité | 50 |
| montant | 5 000 F |
| PDF relevé | `50` |
| Devis quantité | `50,00 u` |

---

Fichiers clés : `ligneReleveCalcul.js` (calculs), `formatLigneMesures.js` (formatage), `devisGrouping.js` (lignes PDF/devis), `devisExport.js` (HTML PDF).

Si tu veux, on peut ensuite documenter un cas précis de ton catalogue (ex. `lxhxe` ou un article `ind_article=1`).

---

**User**

Corrige modifier l ouvrage dans le menu plus (Type) en affichange la formule x n (au lieu de lxhxn dur)

---

**Cursor**

Je remplace le libellé fixe « L x H x N » par la formule dynamique via `formatFormuleDimensionLabel`.


Le champ **Type** utilise maintenant la formule réelle de l’unité, comme dans le PDF.

### Avant
`Dimension (L x H x N)` — texte fixe pour toutes les unités dimension.

### Après
`Dimension (l x h x n)` — dérivé de `unites.formule` via `formatFormuleDimensionLabel` :

| Formule | Affichage Type |
|---------|----------------|
| `lxh` | Dimension (l x h x n) |
| `lxhxe` | Dimension (l x h x e x n) |
| `u` | Unitaire (n) |

### Fichiers
- `formatLigneMesures.js` — helper partagé `formatUniteTypeLabel(indDimension, formule)`
- `OuvrageFormModal.js` — modal « Modifier l’ouvrage » (menu Plus)
- `OuvrageDetailsScreen.js` — écran détail ouvrage/article

Le libellé **Type** se met aussi à jour quand tu changes l’unité dans le formulaire de modification.

---

**User**

property chantierColors doesnt exist

---

**Cursor**

L'import `chantierColors` a été retiré par erreur — je le rétablis.


Corrigé : l’import `chantierColors` depuis `../../styles/theme` manquait dans `OuvrageFormModal.js` après la dernière modification. L’erreur ne devrait plus apparaître.

---

**User**

@prompts_4.md (49-58) 

---

**Cursor**

J'implémente `ind_tva` sur les relevés et le toggle TVA avec les montants dans le formulaire client/chantier.


Implementing `ind_tva` on relevés end-to-end: schema, calculations, UI toggle, and devis export.


Updating `ClientChantierFormScreen.js` with the TVA toggle and amount summary.


Point 17 est implémenté. Voici ce qui a été fait :

### Base de données
- Colonne `ind_tva` (0/1) sur `releves` : migration Supabase, `schema.sql`, SQLite local + sync (`terrainSync.js`, `terrain-sync/index.ts`).

### Calcul des montants
- Nouveau utilitaire `src/utils/releveFacturation.js` : remise en montant FCFA déduit du brut, puis HT / TVA 18% / TTC selon `ind_tva`.
- `refreshReleveTotaux` prend en compte remise + `ind_tva` du relevé.
- `insertReleveLocal` initialise `ind_tva` depuis l’entreprise si non fourni.

### Écran Client / Chantier (rôles A et S)
- Toggle **TVA Oui / Non** sous la remise (défaut = `entreprise.ind_tva` pour un nouveau relevé).
- Récapitulatif en direct : montant remise, HT, TVA et TTC (TVA/TTC masqués si TVA = Non).
- Persistance via `indTva` dans `finalizeDimensionDraftLocal`.

### Devis PDF
- `buildDevisHtml` utilise `releve.ind_tva` (plus seulement `entreprise.ind_tva`).
- Totaux du devis incluent la ligne Remise.
- `ChantierDetails` charge le relevé avant l’export.

### Admin web
- Champ `ind_tva` ajouté sur la table `releves`.

**À noter :** la remise est traitée comme un **montant fixe en FCFA** (pas un pourcentage). Les relevés existants migrés auront `ind_tva = 0` jusqu’à modification manuelle.

---

**User**

build the apk from eas for android, what is the command

---

**Cursor**

Checking the project's EAS configuration for the exact build command and profile.


For an **APK** on this project, use the **preview** profile (it’s configured with `"buildType": "apk"` in `eas.json`):

```bash
eas build -p android --profile preview
```

Or via the npm script already in `package.json`:

```bash
npm run build:android:preview
```

**Notes:**
- You must be logged in: `eas login`
- First time on the machine: `npm install -g eas-cli` (or `npx eas-cli build ...`)
- EAS builds in the cloud; when it finishes, you get a download link for the `.apk`

**Production profile** (`npm run build:android:production`) builds an **AAB** (Play Store), not an APK — use preview if you want a direct installable APK.

