# Prompts discussion in markdown
_Exported on 6/7/2026 at 14:26:35 GMT from Cursor (3.7.12)_

---

**User**

@prompts_3.md (92-99) 

---

**Cursor**

Implementing the photo/logo features from prompts_3.md. Exploring the codebase to see what's already in place.


Implementing photo/logo UI across the app: installing dependencies and adding shared utilities and components.


Implemented **prompt 22** (forms & details for logos/photos). Summary:

### Entreprise — logo (Pro only)
- **Profil (mobile)** : logo shown in view mode; in edit mode, file picker (camera/gallery) for Pro accounts; disabled for Gratuit with a hint.
- **Admin web** : logo preview in details; file input on create/edit; upload to Supabase Storage; disabled when `ind_pro = 0`.

### Client & chantier
- **ClientChantierFormScreen** : Photo 1, 2, 3 after Notes, with camera/gallery choice.
- Photos are saved on finalize via `chantierPhotoUris`.

### Détail chantier
- **Footer** : buttons Photo 1/2/3 only when a photo exists → view + delete.
- **Ligne relevé** : photo watermark on the card (reduced opacity); tap opens view + delete.
- Notes still open when there is no photo.

### Saisie ligne (PaveSaisieOneHand)
- Notes, Prix, Photo as **icon-only** buttons (photo after Prix).
- Camera/gallery on photo tap; saved with the line (draft or direct insert).

### New shared pieces
- `terrainImagePicker.js` — camera/gallery picker  
- `TerrainPhotoInput.js` — form photo slots  
- `TerrainImageViewModal.js` — view + delete  
- `AdminImageFileField.js` — web admin file upload  
- Delete helpers: `clearEntrepriseLogoLocal`, `clearChantierPhotoLocal`, `clearLigneRelevePhotoLocal`  
- Installed **`expo-image-picker`** + permissions in `app.json`

Gratuit accounts: photos work locally; logo remains Pro-only. Pro accounts sync via the existing `terrainImageStorage` pipeline.

---

**User**

<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: success
task_id: 641800
title: Install expo-image-picker dependency
output_path: C:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\641800.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

`expo-image-picker` installed successfully (SDK 54 compatible).

The photo/logo work from prompt 22 is in place: logo on Profil and Admin web (Pro only), chantier photos on the client/chantier form and detail screen, and ligne relevé photos with icon buttons in saisie.

Restart the Expo dev server if it was already running so the new native module and `app.json` permissions are picked up.

---

**User**

are photos fields et details implemented in Master screen Web?

---

**Cursor**

**Partially.** On the Master Admin web screen (`AdminScreen.js`):

### Fully implemented — **logo entreprise**
- Field in schema (`logo`, `isImageFile`)
- **Details** : image preview via signed Supabase URL (`AdminImagePreview`)
- **Create / Edit** : file input, upload to cloud, preview
- **Disabled** for comptes Gratuit (`ind_pro = 0`)

### Partially implemented — **photos chantier & ligne relevé**
- Fields exist in schema : `photo_1`, `photo_2`, `photo_3` (chantiers) and `photo` (ligne_releves)
- **Details** : preview works if a storage key is already set (e.g. from mobile sync)
- **Create / Edit** : no file input — only the storage key text and this message:

> *« Upload fichier disponible pour le logo entreprise. Les photos chantier/ligne se gerent depuis le mobile. »*

So on web admin, only the **logo** has full upload/edit. Chantier and ligne photos are view-only when a key exists; upload on web is not wired yet.

I can add file upload for chantier and ligne photos on the Master screen if you want.

---

**User**

add file upload for chantier and ligne photos on the Master screen if you want.

---

**Cursor**

Adding chantier and ligne photo uploads to the Master Admin web screen, mirroring the logo flow.


Done. The Master Admin web screen now supports file upload for all image fields:

### Chantiers — `photo_1`, `photo_2`, `photo_3`
- File picker + preview on create/edit
- Upload to `entreprises/{entrepriseId}/chantiers/{chantierId}/{slot}.*`
- Enabled once a **client** is selected (to resolve `entreprise_id`) and the chantier **id** exists (auto-generated on create)

### Ligne relevés — `photo`
- Same file picker flow
- Upload to `entreprises/{entrepriseId}/chantiers/{chantierId}/ligne_releves/{ligneId}/photo.*`
- Enabled once a **relevé** is selected (resolves chantier + entreprise) and the ligne **id** exists

Details view still shows the image preview when a storage key is set. **Enregistrer** saves the key to Supabase like the logo field.

Upload stays disabled with a hint until the required FK (client or relevé) is selected.

---

**User**

Je ne vois pas les photos du chantiers dans le details de chantier. Les photos doivent etre juste en bas du dernier ligne releve. 

---

**Cursor**

Vérifiant l'affichage des photos dans le détail chantier et leur placement sous la dernière ligne relevé.


Le `ListFooterComponent` est passé à `LignesReleveGroupedSections` mais n'est jamais transmis au `SectionList`. Correction en cours, avec rechargement des photos du chantier depuis la base.


Évitant de notifier le parent à chaque rechargement — mise à jour locale uniquement.


Deux problèmes corrigés :

### Cause principale
`ListFooterComponent` était passé depuis `ChantierDetails`, mais **`LignesReleveGroupedSections` ne le transmettait pas** au `SectionList` — les boutons photo n’apparaissaient jamais.

### Corrections
1. **`LignesReleveGroupedList.js`** — le footer est maintenant branché sur le `SectionList`, juste après la dernière ligne relevé.
2. **`ChantierDetails.js`** — rechargement du chantier depuis SQLite (`photo_1`, `photo_2`, `photo_3`) à chaque ouverture / pull-to-refresh.
3. Affichage simplifié : boutons **Photo 1 / 2 / 3** directement sous la dernière dimension, sans titre de section.

Les photos devraient maintenant s’afficher en bas de la liste des dimensions. Faites un pull-to-refresh si vous venez d’en ajouter.

---

**User**

Icone chevauche Photo

---

**Cursor**

Deux causes probables : le FAB PDF chevauche les boutons à droite, et l’icône « image » chevauche le texte dans un bouton trop étroit. Correction des deux.


Corrigé. Deux chevauchements possibles :

1. **FAB PDF (droite)** — les boutons photo passaient sous l’icône PDF → marge à droite (`FAB_HORIZONTAL_INSET`) sur la zone photo.
2. **Dans le bouton** — icône `image` + texte « Photo 1 » trop serrés → libellé raccourci à **1, 2, 3** (comme dans le spec), espacement icône/texte augmenté, largeur minimale du bouton.

Le modal affiche toujours « Photo 1 », « Photo 2 », etc. au clic.

---

**User**

juste l icone photo (pas 1, 2 ou 3)

---

**Cursor**

Les boutons photo affichent maintenant **uniquement l’icône** `image`, sans texte 1/2/3. Le numéro reste visible dans le titre du modal au clic (`Photo 1`, etc.) pour l’accessibilité.

---

**User**

@prompts_3.md (101-103) 

---

**Cursor**

Prompts 23 et 24 sont en place :

### 23 — Watermark ligne relevé
Sur la card avec photo, l’image n’est plus en filigrane : c’est l’**icône `image`** (comme les boutons photo chantier), centrée, opacité réduite.

### 24 — Modal photo
- **Télécharger** : enregistre la photo (Téléchargements sur Android, dossier `Photos/` de l’app sur iOS), même logique que les PDF.
- **Supprimer** : bouton **gris** (`#9CA3AF`) à la place du rouge.

S’applique aux photos chantier et ligne relevé via `TerrainImageViewModal`.

---

**User**

Enleve les ecriture Telecharger et supprimer. Remplace par icon. Augmente les photos bouton de chantier (fit 3 sur la ligne)

---

**Cursor**

Modifications effectuées :

### Modal photo
- **Télécharger** → icône `download` (bouton orange)
- **Supprimer** → icône `delete` (bouton gris)
- **Fermer** conserve le libellé texte

### Boutons photo chantier
- Boutons plus grands (`minHeight: 58`, icône 36px)
- **`flex: 1`** sur chaque bouton pour répartir la largeur : 3 photos tiennent sur une seule ligne
- Même style bordure que avant, zone tactile élargie

---

**User**

- Corrige le francais a travers l application. Accents, apostrophe, etc. Bon francais. Ne remplace pas les mots

---

**Cursor**

Recherchant dans l'application les textes français sans accents ni apostrophes correctes.


Vérifiant que les corrections ont bien été appliquées et corrigeant ce qui reste.


Corrigeant les chaînes restantes, notamment dans `App.js` et quelques fichiers encore incomplets.


Appliquant les dernières corrections identifiées.


La correction du français est terminée dans toute l’application. Voici ce qui a été fait :

**Passage global (31+ fichiers)** — accents, apostrophes et typographie, sans changer le vocabulaire métier (chantier, devis, relevé, ouvrage, etc.) :
- Écrans : Profil, Chantiers, Clients, Ouvrages, Login, Plus, Nouvelle dimension, Saisie, Admin web…
- Composants : modales, cartes, photos, export PDF/devis
- Messages d’erreur utilisateur dans `querries.js`, sync, auth, picker d’images

**Dernières corrections complémentaires :**
- **`App.js`** : « était », « refusée », « n'avez », « d'ouvrir », espace avant `?`
- **`AdminScreen.js`** : « DONNÉES », « clé de stockage »
- **`querries.js`** : message d’erreur lisible (plus de noms techniques `clientNomComplet`…)
- **`app.json`** : permissions caméra/galerie (« accède à », « caméra », « relevés »)

Les identifiants de code (`telephone_1`, `releve_id`, logs console, commentaires techniques) ont été laissés tels quels, conformément à la consigne de ne pas remplacer les mots du domaine.

---

**User**

- Ajoute le logo de l entreprise en bg right bottom corner et en header pour facture et PDF. Si compte gratuit ou logo non disponible, logo de l app losange

---

**Cursor**

Explorant la génération des PDF/devis et la gestion du logo entreprise pour intégrer le logo en en-tête et en filigrane.


Création d'un utilitaire pour résoudre le logo (entreprise Pro ou Losange) et intégration dans les templates HTML des PDF/devis.


Le logo est maintenant intégré aux exports **devis** et **PDF dimensions**.

### Comportement
- **Compte Pro + logo enregistré** → logo entreprise (header + filigrane bas droite)
- **Compte gratuit ou logo absent** → logo Losange (`assets/logo2.png`)

### Fichiers
- **`src/utils/exportLogo.js`** — résolution du logo en data URI base64 pour l’HTML PDF
- **`src/utils/devisExport.js`** — logo en en-tête (à droite) et filigrane fixe en bas à droite (opacité ~14 %)
- **`src/screens/ChantierDetails.js`** — chargement de l’entreprise aussi pour le PDF dimensions

### Mise en page
- **Devis** : logo à droite du bloc entreprise, filigrane derrière le contenu
- **PDF dimensions** : logo à droite du titre, même filigrane ; la date de relevé reste visible au-dessus (z-index plus élevé)

Les images sont embarquées en base64 pour un rendu fiable avec `expo-print`.

---

**User**

Icon chevauche Telecharger et Whatsapp pour PDF et Devis

---

**Cursor**

Remplaçant les `MobileButton` Paper (icône + texte qui se chevauchent) par un bouton avec mise en page explicite.


Corrigé dans `ChantierDetails.js` : les boutons **Télécharger** et **WhatsApp** utilisaient `MobileButton` (react-native-paper) avec `textAlign: 'center'` sur le libellé, ce qui faisait chevaucher l’icône et le texte.

Ils sont remplacés par un composant `ExportActionButton` avec une mise en page explicite :
- `flexDirection: 'row'`
- `gap: 12` entre icône et texte
- contenu centré dans le bouton

L’icône et le libellé ne se superposent plus sur l’overlay PDF/Devis.

---

**User**

Logo dans le header juste avant le nom de l enteprise

---

**Cursor**

Déplaçant le logo à gauche, juste avant le nom de l'entreprise dans l'en-tête des exports.


Le logo est maintenant placé **à gauche, juste avant le nom de l’entreprise** dans l’en-tête :

- **Devis** : `[Logo] Nom de l’entreprise · téléphone · adresse`
- **PDF dimensions** : même disposition (logo avant le titre)

Le filigrane en bas à droite est inchangé.

---

**User**

fichier PDF renomme releve_xxx au lieu de dimension_xxx. Aussi dans le header, mention Relevés au lieu de Dimensions

---

**Cursor**

Modifications appliquées dans `devisExport.js` :

- **Nom du fichier** : `releve_<chantier>_<date>.pdf` (à la place de `dimensions_…`)
- **En-tête PDF** : `RELEVÉS - Client / Chantier` (à la place de `DIMENSIONS - …`)
- **Dossier iOS** (enregistrement local) : `Relevés` au lieu de `Dimensions`

---

**User**

Dans la base de données, ajoute Métier après client. On clique montre la liste des métiers (cards). PAs de page details. L utilisateur peut trier la liste des metiers en hold la card et bougeant dans la liste. Le meme ordre des metier sera respecté lors du choix de metier pour chantier

---

**Cursor**

Explorant la structure actuelle des métiers, de la base de données et du flux de sélection.


Voici ce qui a été ajouté :

### Base de données → Métiers
- Nouveau bouton **Métiers** (entre Clients et Ouvrages)
- Écran **ListeMetiersScreen** : cartes colorées, sans page détail
- **Maintenir une carte** pour la glisser et réordonner la liste

### Persistance de l’ordre
- Table locale `metiers_ordre` (ordre par métier)
- `getMetiersLocal()` trie d’abord par cet ordre, puis par nom
- Le **choix du métier** lors d’un nouveau chantier/relevé utilise le même ordre (`NouvelleDimensionScreen`, `SelecteurMetierOuvrage`)

### Technique
- `react-native-draggable-flatlist` + gesture-handler + reanimated
- `babel.config.js` pour Reanimated
- Redémarrer le serveur Expo (`npx expo start -c`) après ces changements

L’ordre est **local à l’appareil** (non synchronisé Supabase). Les métiers sans ordre défini restent triés par nom à la fin.

---

**User**

<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: success
task_id: 513843
title: Install drag-reorder dependencies via Expo
output_path: C:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\513843.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

Les dépendances pour le glisser-déposer (`react-native-draggable-flatlist`, `react-native-gesture-handler`, `react-native-reanimated`) sont installées.

La section **Métiers** est en place dans Base de données, avec réordonnancement par appui long et le même ordre lors du choix du métier sur un chantier.

Redémarrez Expo avec un cache vidé pour prendre en compte Reanimated :

```bash
npx expo start -c
```

---

**User**

@c:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\1.txt:944-1024 

---

**Cursor**

Le preset Babel `babel-preset-expo` est absent — il devient requis après l'ajout de `babel.config.js`. Installation en cours.


L’erreur venait du `babel.config.js` ajouté pour Reanimated : il référence `babel-preset-expo`, qui n’était pas installé explicitement (Expo le gérait implicitement avant).

**Correction :** `babel-preset-expo` a été installé via `npx expo install babel-preset-expo`.

Relancez le serveur avec le cache vidé :

```bash
npx expo start -c
```

---

**User**

installedTurboModule Called with 1 argument

---

**Cursor**

Le projet utilise l'ancienne architecture (`newArchEnabled: false`) alors que Reanimated v4 exige la nouvelle — d'où l'erreur TurboModule. Nous passons à Reanimated v3, compatible avec Expo Go.


L’erreur **`installedTurboModule Called with 1 argument`** venait de **Reanimated v4**, qui exige la **nouvelle architecture** React Native. Votre projet a `newArchEnabled: false` dans `app.json`, donc les modules natifs ne correspondaient pas (surtout avec Expo Go).

**Corrections appliquées :**
- Reanimated rétrogradé en **v3.17.4** (compatible ancienne architecture)
- Exclusion de la v4 dans `package.json` pour éviter qu’Expo la réinstalle
- Import de `react-native-reanimated` ajouté dans `index.js`

Relancez avec cache vidé :

```bash
npx expo start -c
```

Puis rechargez l’app sur le téléphone (secouer → Reload). L’écran **Métiers** avec glisser-déposer devrait fonctionner.

---

**User**

HOSTOBJECT::get for prop 'REanimatedModule':java.lang...

---

**Cursor**

Investigating the Reanimated setup — this error usually indicates a native module mismatch or missing initialization.


Expo Go SDK 54 bundles Reanimated v4 natively; our v3 downgrade causes the native module mismatch. Upgrading to Reanimated v4 and enabling the New Architecture.


Même famille d’erreur que tout à l’heure, mais avec une cause différente : **Expo Go SDK 54 embarque Reanimated v4 en natif**, alors que le projet avait été rétrogradé en **v3**. Le JS et le module natif ne correspondaient plus → `REanimatedModule` / `NullPointerException`.

**Corrections appliquées :**
- Reanimated remis en **v4.1** + **`react-native-worklets`**
- **`newArchEnabled: true`** dans `app.json` (Reanimated v4 l’exige)
- Plugin Babel manuel retiré (`babel-preset-expo` le gère)
- Exclusion v4 retirée de `package.json`

Relancez proprement :

```bash
npx expo start -c
```

Vérifiez aussi que **Expo Go sur le téléphone est bien à jour** (SDK 54). Puis rechargez l’app.

Si l’erreur persiste, fermez complètement Expo Go et relancez le scan du QR code.

---

**User**

@prompts_3.md (105-109) 

---

**Cursor**

Implementing the Rapports dashboard: exploring the Plus menu, chantier data model, and navigation patterns.


Implementing the Rapports dashboard with data queries, chart UI, and access rules (Pro + Admin/Commercial only).


Implémentation du dashboard **Rapports** terminée.

### Menu Plus
- Bouton **Rapports** (icône graphique) sous **Base de données**
- Visible uniquement pour les comptes **Pro** avec rôle **Admin** ou **Commercial** (`access_rules.md`)

### Écran Rapports
- **Camembert** : répartition des chantiers par statut (Dimension, Devis, En cours, Terminé, Annulé)
- **Barres empilées** : évolution sur **12 mois** (mois courant inclus), empilée par statut
- **Bascule Nombre / Montant** : compte les chantiers ou somme les montants HT des lignes de relevé
- Légende couleur par statut, pull-to-refresh

### Fichiers touchés
- `src/screens/RapportsScreen.js` — dashboard
- `src/utils/chantierReportStats.js` — agrégations
- `src/db/querries.js` — `getChantiersReportRowsLocal`
- `src/utils/terrainAccess.js` — `canAccessRapports`
- `src/screens/PlusScreen.js`, `App.js` — navigation

Relancez avec `npx expo start -c` pour tester. Le bouton n’apparaît que si vous êtes connecté en **Pro Admin/Commercial**.

---

**User**

- Liste des metiers dans ...Plus, scrollable pour montrer tout les metiers

---

**Cursor**

Le `DraggableFlatList` n'occupait pas l'espace restant — ajout de `flex: 1` pour activer le défilement.


La liste **Métiers** est maintenant scrollable.

Le `DraggableFlatList` ne prenait pas la hauteur disponible sous le header, donc les métiers en bas restaient coupés. Correction : conteneur `flex: 1` + `minHeight: 0` autour de la liste, et `flex: 1` sur la liste elle-même.

Rechargez l’app et testez **Plus → Base de données → Métiers** : vous devriez pouvoir faire défiler toute la liste tout en gardant le glisser-déposer au long appui.

---

**User**

@c:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\1.txt:1027-1028 

---

**Cursor**

Le paquet était bien déclaré dans `package.json`, mais absent ou incomplet dans `node_modules`. J’ai relancé l’installation :

```bash
npm install react-native-gifted-charts react-native-svg
```

Les deux modules sont maintenant présents. Relancez Metro avec le cache vidé :

```bash
npx expo start -c
```

Puis rechargez l’app sur Android. L’écran **Rapports** devrait bundler correctement.

---

**User**

Error Gradient package was not found. Make sur react-native-linear-gradient or expo-linear-gradient is installed

---

**Cursor**

`react-native-gifted-charts` a besoin d’un module de dégradé. J’ai installé **`expo-linear-gradient`** (compatible Expo SDK 54).

Relancez avec cache vidé :

```bash
npx expo start -c
```

Puis rechargez l’app. L’écran **Rapports** devrait s’afficher sans cette erreur.

---

**User**

<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: success
task_id: 787296
title: Install expo-linear-gradient for gifted-charts
output_path: C:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\787296.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

`expo-linear-gradient` est installé (`~15.0.8`) — c’était la dépendance manquante pour les graphiques de **Rapports**.

Relancez avec :

```bash
npx expo start -c
```

Puis rechargez l’app sur le téléphone.

---

**User**

@access_rules.md (18-29) 

---

**Cursor**

Implementing free-account restrictions from access_rules.md. Exploring what's already in place.


Implementing free-account restrictions across the codebase.


Les règles **Compte Gratuit** de `access_rules.md` sont en place :

| Règle | Implémentation |
|--------|----------------|
| Max 10 chantiers | Blocage à la création (`insertChantierLocal`) |
| Max 10 clients | Blocage à la création (`insertClientLocal`) |
| Max 3 métiers utilisables | `getMetiersForSelectionLocal` — 3 premiers selon l’ordre dans Métiers |
| Max 10 ouvrages / métier | Blocage à la création (`insertOuvrageWithUniteLocal`) |
| Pas de OK par ligne | Double-tap désactivé + garde en base (Pro only) |
| Sync limitée | Entreprise + profil uniquement (`runTerrainSyncFreePushPull`) |
| Pas de WhatsApp | Bouton masqué sur compte gratuit |
| Pas de TVA | Toggle désactivé + jamais appliquée en gratuit |
| Pas de logo PDF/devis | Aucun logo ni filigrane en gratuit |
| Rapports désactivés | Déjà en place (Pro + Admin/Commercial) |

**Sync** : visible pour les admins même en gratuit (entreprise/profil seulement). Message adapté dans Plus.

**Métiers** : la liste complète reste visible et réordonnable ; seuls les **3 premiers** sont proposés lors de la saisie des dimensions.

**Max 1 utilisateur** : règle côté Supabase/admin — pas de création d’utilisateurs dans l’app mobile.

---

**User**

update .gitgnore

---

**Cursor**

Updating `.gitignore` with missing Expo/Android patterns and local dev artifacts (e.g. Cursor transcripts).


`.gitignore` mis à jour avec :

| Ajout | Raison |
|--------|--------|
| `build/`, `*.tar.gz` | Exports / archives de build |
| `*.keystore`, `*.hprof`, `local.properties` | Artefacts Android |
| `prompts/transcripts/` | Exports de conversations Cursor (auto-générés) |
| `prompts/terminal.txt` | Journal terminal local |
| `.turbo/` | Cache outil de build |

Les règles existantes sont conservées (`expo.dev`, `.env*`, `node_modules/`, `.expo/`, `dist-*/`, etc.).

**Note :** `prompts/terminal.txt` est déjà suivi par git — le `.gitignore` ne s’applique pas aux fichiers déjà commités. Pour l’ignorer :

```bash
git rm --cached prompts/terminal.txt
```

---

**User**

26. Dans un compte PRO existant (app) la liste des metiers ne s affiche pas dans le menu Plus (base de données).


---

**Cursor**

Investigating why the métiers list is empty for Pro accounts in Plus → Base de données.


Likely cause: existing Pro sessions don't refresh the catalogue from Supabase, so the local `metiers` table stays empty. Fixing catalogue refresh and list rendering.


Deux causes possibles corrigées :

### 1. Catalogue vide (compte Pro déjà connecté)
Les sessions restaurées au démarrage ne rechargeaient pas les **métiers** depuis Supabase. Désormais :
- **Au lancement** : si le catalogue local est incomplet → pull automatique depuis Supabase
- **À l’ouverture de Métiers** : si la liste est vide (Pro) → rechargement du catalogue cloud
- Nouvelle fonction `refreshCatalogueFromCloudLocal()` (métiers, unités, ouvrages)

### 2. Affichage de la liste
Ajustements sur `DraggableFlatList` (`containerStyle`, retrait de `flexGrow` qui pouvait masquer les cartes).

**Pour tester :** rechargez l’app (connexion internet requise), allez dans **Plus → Base de données → Métiers**. Si besoin, tirez vers le bas pour actualiser.

Si la liste reste vide, vérifiez que des métiers existent bien dans Supabase (écran Admin web).

---

**User**

@design.md (179-181) 

---

**Cursor**

Updating report charts to use FCFA, hide in-chart labels, and use « Relevé » instead of « Dimension » in the legend.


Modifications appliquées selon `design.md` :

### FCFA partout
- **Rapports** : montants en `FCFA` / `k FCFA` / `M FCFA` (plus de `€`)
- **App** : `formatMontant()` utilise maintenant `formatMontantFcfa()` (`1 234 FCFA` au lieu de `1 234 F`)

### Rapports — graphiques
- **Camembert** : libellés sur les parts supprimés (`showText={false}`) — seule la **légende** indique les statuts
- **Légende** : statut **D** affiché comme **« Relevé »** (plus « Dimension »)

Rechargez l’écran **Rapports** pour voir le résultat.

---

**User**

- Dans rapport, montant HT seulement (pas TTC)

---

**Cursor**

Les montants proviennent déjà des lignes de relevé (HT). Clarifions les libellés de l'interface pour indiquer explicitement « HT ».


Les rapports utilisaient déjà la somme des **montants HT** des lignes de relevé (`quantité × P.U.`), jamais le TTC.

**Libellés mis à jour :**
- Bascule **« Montant HT »** (au lieu de « Montant »)
- Titres **« Montants HT par statut / par mois »**
- Sous-titre explicite : *Montants hors taxes (HT) des relevés*
- Centre du camembert : **Total HT** (inchangé)

Les valeurs affichées restent en **FCFA HT** uniquement.

---

**User**

- Enleve categorie Annulé du rapport.

---

**Cursor**

La catégorie **Annulé** est retirée des rapports :

- Exclue de la légende et des graphiques (`REPORT_STATUS_ORDER` sans `Z`)
- Chantiers annulés ignorés dans les agrégations
- Requête SQL filtrée : `status != 'Z'`

Seuls **Relevé**, **Devis**, **En cours** et **Terminé** apparaissent désormais.

---

**User**

- Dans le pie et bar chart, ne montre les nombres et montant par default dans le chart. Montre seulement on clique sur les categories dans la legende ou dans le chart meme.

