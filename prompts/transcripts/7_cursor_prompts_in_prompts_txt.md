# Default dimension value setting
_Exported on 5/30/2026 at 23:06:49 GMT from Cursor (3.6.21)_

---

**User**

Lorsque la page entrez les dimensions est ouvert, par default n = 1.

---

**Cursor**

Je cherche l'écran « entrez les dimensions » et où la valeur par défaut de `n` est définie.


Dans `PaveSaisieOneHand.js`, `n` est vide à l’ouverture alors qu’il n’est affiché que visuellement comme `1`. Je le mets à `'1'` par défaut dans l’état initial et après enregistrement.


Je traite aussi une valeur vide de `n` comme `1`, pour rester cohérent si l'utilisateur efface le champ.


C’est en place dans `PaveSaisieOneHand.js` (écran « Entrez les dimensions »).

**Changements :**
- **`n` vaut `1` à l’ouverture** — état initial `nombre: '1'` au lieu de `''`
- **Après enregistrement d’une ligne**, le formulaire repart aussi avec `n = 1`
- **Plus de remise à zéro** quand on touche le champ `n` — on part de `1` et on peut le modifier au clavier
- **Si `n` est vide**, il est traité comme `1` pour le calcul de quantité et la validation

Le champ `n` est donc réellement à 1 dès l’ouverture, pas seulement affiché visuellement.

---

**User**

- Lorsque les info de la dimension ne sont pas complete, suivant est disabled (reduced opacity)

---

**Cursor**

Je cherche où le bouton « suivant » est géré et comment son état disabled est appliqué.


Le bouton « suivant » a déjà la logique `disabled`, mais `preserveOpacityWhenDisabled` empêche l’opacité réduite. Je corrige `FlowSmallFab` pour l’afficher quand il est désactivé.


Je corrige la condition : l’opacité réduite ne doit s’appliquer qu’avec `preserveOpacityWhenDisabled`.


C’est corrigé.

**Comportement du bouton « suivant »** (flèche bleue, écran « Entrez les dimensions ») :
- **Désactivé** tant que les cotes requises ne sont pas saisies **et** qu’aucune ligne n’a encore été enregistrée via `+`
- **Activé** dès que le formulaire est complet, ou si au moins une ligne a déjà été ajoutée (pour passer au récap)

**Correction visuelle** : `FlowSmallFab` utilisait `preserveOpacityWhenDisabled` pour garder la couleur bleue, mais n’appliquait pas l’opacité réduite. Le style `fabDisabled` (opacité 0,45) s’applique maintenant quand le bouton est désactivé.

En pratique : à l’ouverture de l’écran, avec largeur/hauteur vides, « suivant » apparaît bien estompé et n’est pas cliquable. Il redevient pleinement visible dès que toutes les cotes obligatoires sont renseignées.

---

**User**

pareille pour le bouton + 

---

**Cursor**

Je mets le bouton « + » dans le même état désactivé (opacité réduite) lorsque les dimensions ne sont pas complètes.


C’est fait. Le bouton **+** est maintenant désactivé avec opacité réduite (`0,45`) tant que les cotes requises ne sont pas complètes — même logique visuelle que « suivant ».

Il redevient actif dès que le formulaire est valide (largeur, hauteur, etc. selon l’ouvrage-unité).

---

**User**

@design.md (68-69) 

---

**Cursor**

Je vais examiner le flux actuel des dimensions, du récap et de l'enregistrement pour appliquer les changements du design.


Je remplace « suivant » par une icône liste vers le récap, et je fais pointer « Enregistrer » vers l’écran client/chantier.


L'implémentation est déjà en place ; il manque seulement l'import de `setDraftUiStep` dans `App.js`.


Les points du design (lignes 68–69) sont en place. Voici le flux :

**Icône liste** (à la place de « suivant ») — écran saisie des dimensions
- Petit bouton gris `format-list-bulleted` à droite du `+`
- Au clic : enregistre la ligne en cours si le formulaire est complet, puis ouvre le **récap**
- Désactivé (opacité réduite) s’il n’y a aucune ligne et que le formulaire est incomplet

**Bouton Enregistrer** (barre du bas)
- Désactivé pendant métier, ouvrage et saisie des dimensions
- **Activé sur le récap** dès qu’il y a au moins une ligne → ouvre **Client et chantier**
- Retour depuis Client/Chantier ramène au récap

**Récap**
- Plus de flèche « suivant » à droite — seule la barre du bas sert à continuer
- Bouton retour à gauche pour revenir à la saisie

J’ai aussi corrigé l’import manquant de `setDraftUiStep` dans `App.js` pour que le retour depuis Client/Chantier fonctionne correctement.

---

**User**

- Au lieu d un FAB pour profil, ajouter un bouton large dans l ecran (en bas du navbar). Update le format de deconnexion (format +)

---

**Cursor**

Je remplace le FAB profil par un bouton large en bas de l'écran et je mets la déconnexion au format « + » (grand FAB).


Écran **Plus** mis à jour :

**Profil** — plus de FAB flottant. Bouton large « Profil » (icône compte) en bas de l’écran, juste au-dessus de la barre de navigation, sur toute la largeur disponible à gauche du bouton de déconnexion.

**Déconnexion** — grand FAB rouge à droite, même format que le **+** des chantiers (`FlowActionFab`, 70 px).

Les deux éléments sont alignés en bas : le bouton Profil laisse la place à la colonne de droite pour ne pas chevaucher le FAB.

---

**User**

- le bouton profil en haut (premiere ligne apres navbar/ Header)

---

**Cursor**

Le bouton **Profil** est maintenant en haut de l’écran, juste sous le header « Plus » (première ligne du contenu). Le bouton **Déconnexion** reste en bas à droite au format grand FAB.

---

**User**

Fais descendre un peu Notes et qte lors de la saisie

---

**Cursor**

J’ai augmenté l’espacement vertical :

- **Notes** : `marginTop` 6 → 14 px (plus bas sous les champs l/h/n)
- **Qté** : `marginTop` 12 → 18 px (un peu plus bas sous Notes)

---

**User**

@design.md (75-76) 

---

**Cursor**

Je mets en place le passage direct à la saisie pour les ouvrages à une seule unité, et le tri alphabétique de la liste.


**Ouvrage à une seule unité**
- Au clic sur un ouvrage, si une seule unité existe → sélection automatique et passage direct à **Entrez les dimensions**
- Si plusieurs unités → affichage du choix d’unité comme avant
- La section « Unité » n’apparaît que lorsqu’il y a **plus d’une** unité

**Tri alphabétique**
- Les ouvrages sont triés par nom dans `getOuvragesByMetierMock` (locale `fr`)
- Côté SQLite, le tri `ORDER BY nom ASC` était déjà en place dans `querries.js`

---

**User**

- l icon liste en bg jaune et icon noir

---

**Cursor**

C’est fait. L’icône liste a maintenant un fond **jaune** (`#FACC15`) et l’icône est en **noir**.

---

**User**

@design.md (78-80) 

---

**Cursor**

J'évite le doublon « Récapitulatif » dans le titre et le sous-titre.


Écran récap mis à jour :

**Bouton retour** — grand FAB à droite (`FlowBackFab`, même format que le `+`), flèche grise, retour à la saisie des dimensions.

**Titre** — la page s’appelle maintenant **« Récapitulatif »** (sans sous-titre redondant).

---

**User**

- Annuler : Modal de confirmation "Voulez-vous vraiment annuler tout?"

---

**Cursor**

C’est en place. Lors d’un clic sur **Annuler** (barre du bas, pendant le flux nouvelle dimension ou sur l’écran client/chantier), une modale s’affiche :

**« Voulez-vous vraiment annuler tout? »**

- **Non** — ferme la modale, rien n’est perdu  
- **Oui** — annule le brouillon et retourne à la liste des chantiers  

La même confirmation s’applique au bouton retour de l’étape « Choix du métier » (abandon du flux).

---

**User**

- Card lignes de releve (recap), Qté à Droite

---

**Cursor**

Chaque carte du récap affiche maintenant :

- **Nom de l’ouvrage** en haut
- **Mesures** à gauche et **Qté** alignée à **droite** sur la même ligne
- **Note** en dessous si présente

Exemple : `1.20 x 2.50 x 1` à gauche · `Qté 3.00 Surface` à droite.

---

**User**

@prompts.txt (236-239) 

---

**Cursor**

Je commence par examiner l’écran Client/Chantier, le schéma de données et le flux d’enregistrement existants.


Formulaire **Client et chantier** implémenté selon le prompt.

### Client
- **Nom** et **téléphone** (obligatoires)
- **Recherche** par nom ou téléphone (barre de recherche, résultats cliquables)
- Sélection d’un client existant → remplit les champs ; modification manuelle → nouveau client

### Chantier
- **Nom** (obligatoire), **adresse**, **statut** (chips : Dimension, Devis, En cours, Terminé, Annulé), **notes** (multiligne)

### Enregistrer
- Bouton désactivé tant que nom client, téléphone et nom chantier ne sont pas renseignés
- **Confirmation** : « Confirmer l'enregistrement du client et du chantier? » (Oui / Non)
- Enregistrement : client + chantier + relevé + lignes du brouillon en base, puis retour à la liste des chantiers

### Technique
- Colonne `notes` ajoutée à `chantiers` (migration SQLite)
- Nouvelles fonctions : `searchClientsLocal`, `finalizeDimensionDraftLocal`

---

**User**

- Double click et triple click pour nouvel ouvrage et nouveau metier requis une nouvelle dimension. ie. si il y a deja des entres de largeur ou hauteur (>0), on double/triple clique, montrer un modal "Enregistrer cette mesure d'abord ou annuler avant de procéder".


- Double click et triple click pour nouvel ouvrage et nouveau metier requis une nouvelle dimension. ie. si il y a deja des entres de largeur ou hauteur (>0), on double/triple clique, montrer un modal "Enregistrer cette mesure d'abord ou effacer les donnees avant de procéder".


---

**Cursor**

J’ajoute la détection des mesures en cours dans `PaveSaisieOneHand` et le blocage du double/triple clic avec une alerte dans `NouvelleDimensionScreen`.


C’est en place.

**Double clic** (nouvel ouvrage) et **triple clic** (nouveau métier) sur le `+` sont bloqués si une mesure est en cours : largeur ou hauteur **> 0** (selon les champs requis pour l’ouvrage-unité).

Une alerte s’affiche alors :

**« Enregistrer cette mesure d'abord ou effacer les donnees avant de proceder. »**

Pour continuer, il faut soit enregistrer la ligne avec un simple clic sur `+`, soit effacer les cotes au clavier jusqu’à ce qu’il n’y ait plus de largeur/hauteur saisie.

---

**User**

- Pour simplifier, double click et triple click marche seulement quand + est disabled

---

**Cursor**

Quand le `+` est désactivé, les clics ne passent pas — je corrige pour que le double/triple clic fonctionne quand même visuellement « disabled ».


Je bloque aussi le double/triple clic pendant l'enregistrement.


Logique simplifiée :

| État du `+` | Simple clic | Double clic | Triple clic |
|---|---|---|---|
| **Désactivé** (formulaire incomplet) | — | Nouvel ouvrage | Nouveau métier |
| **Activé** (mesure complète) | Enregistre la ligne | — | — |
| **En cours d'enregistrement** | — | — | — |

Le bouton reste cliquable même quand il est visuellement désactivé (`allowPressWhenDisabled`), pour que le double/triple clic fonctionne. La modale de blocage a été retirée.

---

**User**

Lorsque une dimension est en cours d etre prise (processus en cours), tous les les boutons back ramene a l ecran precedente 

Enleve le bouton back sur l ecran d entree des dimensions

---

**Cursor**

Le bouton retour (flèche à gauche) a été retiré de l’écran **Entrez les dimensions**. Il reste le `+` et l’icône liste pour accéder au récap ; pour revenir à l’ouvrage, il faut utiliser le double clic sur `+` (nouvel ouvrage) ou **Annuler** dans la barre du bas.

---

**User**

- Change le bouton suivant dans recap, a continuer (+). On clique, aller a selection metier. Les donnees deja entree reste enregistree (ne pas effacer)

---

**Cursor**

J'ajoute le bouton « Continuer » (+) sur le récap pour revenir au choix du métier en conservant les lignes déjà saisies.


Sur le **Récapitulatif** :

- Le bouton **+** (format principal) remplace « suivant » → **Continuer**
- Au clic : retour à **Choix du métier** pour ajouter d’autres dimensions
- Les **lignes déjà saisies** restent dans le brouillon (non effacées)

Le petit bouton retour à droite ramène toujours à la saisie en cours ; **Enregistrer** dans la barre du bas mène toujours vers Client et chantier.

---

**User**

- Pas de bouton back dans recap

---

**Cursor**

Le bouton retour a été retiré du récap. Il ne reste que le **+** (Continuer) pour ajouter d’autres dimensions. **Enregistrer** dans la barre du bas mène toujours vers Client et chantier.

---

**User**

@prompts.txt (245-246) 

---

**Cursor**

Je regarde comment le récap et la saisie des dimensions sont structurés pour ajouter l’édition au clic et masquer le « + » en mode modification.


J’implémente l’édition au clic sur une ligne du récap, le préremplissage du formulaire et la suppression du bouton « + » en mode modification.


**Récap → modification**
- Clic sur une ligne du récap → écran de saisie avec **cotes et note préremplies**
- Sous-titre **« Modification »**
- Contexte métier / ouvrage / unité restauré automatiquement

**Mode modification**
- **Pas de bouton +**
- Icône **liste** : enregistre les changements et retourne au récap (mise à jour de la ligne existante, pas de doublon)

**Continuer** depuis le récap et **+** en saisie normale restent inchangés pour ajouter de nouvelles dimensions.

---

**User**

Dans le formulaire client chantier, ne pas montrer status. Par defaut, lors de l enregistrement status = D (dimension)

---

**Cursor**

Le champ **Statut** a été retiré du formulaire Client et chantier.

À l’enregistrement, le chantier est créé avec **`status = 'D'`** (Dimension) automatiquement — déjà pris en charge côté base via `finalizeDimensionDraftLocal` et `insertChantierLocal`.

---

**User**

@prompts_2.txt (1-6) 

---

**Cursor**

Mise à jour de la table **entreprises** :

### SQLite (`localDb.js`)
- **`ind_pro`** : `INTEGER`, 0 ou 1, défaut **0** (free)
- **`ind_active`** : `INTEGER`, 0 ou 1, défaut **1** (actif)
- Migrations `ALTER TABLE` pour les bases déjà installées

### Supabase (`schema.sql`)
- Mêmes champs dans le `CREATE TABLE`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pour les déploiements existants

### Admin web (`AdminScreen.js`)
- Champs ajoutés avec toggles binaires et valeurs par défaut

### Mock (`mockData.js`)
- `MOCK_ENTREPRISE` : `ind_pro: 0`, `ind_active: 1`

Sur une base Supabase déjà en place, exécuter les deux `ALTER TABLE` du schéma (ou le script complet) pour appliquer les colonnes.

---

**User**

@prompts_2.txt (8-13) 

---

**Cursor**

Je commence par examiner le login mobile, l’auth Supabase et le stockage local pour remplacer les mocks.


J’implémente l’auth terrain via Supabase, la sync locale et la vérification `ind_active`.


Je corrige la migration SQLite : `UNIQUE` n’est pas supporté dans `ALTER TABLE ADD COLUMN`.


Le **login mobile Supabase** (prompts_2.txt §2) est en place. Voici ce qui a été fait :

## Comportement

1. **Connexion** — L’app appelle l’Edge Function `terrain-login` avec identifiant + mot de passe (table `profils` Supabase).
2. **Entreprise inactive** — Si `ind_active !== 1`, message **« Compte inactif. »**
3. **Succès** — Données entreprise/profil/catalogue/chantiers synchronisées en SQLite + session locale (`terrain_session`).
4. **Redémarrage** — Session restaurée automatiquement (pas de re-login tant que la session existe).
5. **Déconnexion** — Efface la session locale (Plus → Déconnexion).

## Fichiers ajoutés / modifiés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/terrain-login/index.ts` | Auth + vérif `ind_active` + payload sync |
| `src/auth/terrainAuth.js` | Client mobile (`loginTerrain`, `restoreTerrainSession`, `logoutTerrain`) |
| `src/db/terrainSync.js` | Upsert SQLite + session |
| `src/db/localDb.js` | Colonne `profils.identifiant`, table `terrain_session` |
| `supabase/schema.sql` | `identifiant`, `mot_de_passe` sur `profils` |
| `AdminScreen.js` | Champs identifiant / mot de passe pour les profils |
| `App.js` | Login mock remplacé par Supabase |

## Déploiement requis

1. Exécuter les migrations SQL sur Supabase (`schema.sql`).
2. Créer un profil terrain dans l’admin (identifiant `A00A`, mot de passe, entreprise `ind_active = 1`).
3. Déployer la fonction :
   ```bash
   supabase functions deploy terrain-login
   ```
4. Vérifier `.env` : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Les écrans métier (dimensions, profil, etc.) utilisent encore des **mocks** — c’est la suite logique de prompts_2 (§ « enlever les mock »). Dis-moi si tu veux qu’on enchaîne là-dessus.

---

**User**

@prompts_2.txt (15-21) 

---

**Cursor**

Implémentation des règles de première connexion (réseau requis) et de changement de compte avec effacement local. J’examine le code existant.


J’ajoute la détection réseau, le suivi du compte appareil et le modal de changement de compte.


J’ai introduit une erreur dans `terrainSync.js` — je la corrige.


Prompts_2.txt §3 est implémenté. Voici le comportement :

## 1. Première connexion (données locales vides)

- Avant l’appel Supabase, l’app vérifie si SQLite contient déjà une entreprise.
- **Sans internet** → login refusé avec : *« Veuillez vous connecter pour une première connexion. »*
- **Avec internet** → chargement des données depuis Supabase comme avant.

## 2. Changement de compte sur le même téléphone

- Table `terrain_device` mémorise le **dernier compte connecté** (conservée après déconnexion).
- Si un autre identifiant se connecte alors que des données locales existent → **modal danger** :
  > *« Un AUTRE COMPTE etait connecté à cet appareil. Ses données seront effacées du téléphone. »*
- **Oui** → effacement complet des données locales (entreprise, chantiers, catalogue, session, brouillon dimensions) puis connexion + sync du nouveau compte.
- **Non** → annulation, écran login inchangé.

## Fichiers touchés

| Fichier | Rôle |
|---------|------|
| `src/utils/network.js` | Test de reachability Supabase |
| `src/db/terrainSync.js` | `terrain_device`, détection vide/changement, `clearLocalTerrainData` |
| `src/db/localDb.js` | Schéma `terrain_device` |
| `src/auth/terrainAuth.js` | `assessTerrainLogin`, option `wipeLocal` |
| `App.js` | Modal + flux login mobile |

**Note :** la déconnexion efface la session active mais **garde** `terrain_device` pour détecter un changement de compte au prochain login.

---

**User**

@prompts_2.txt (22-23) 

---

**Cursor**

Je remplace les mocks de la page profil par les données SQLite locales et j’ajoute le badge PRO/Gratuit.


La page **Profil** utilise maintenant les données SQLite locales, sans mock.

## Changements

**Données locales**
- `getLoggedInProfilViewLocal()` dans `querries.js` lit le profil connecté via `terrain_session` + jointure `entreprises` (`ind_pro` inclus).
- `getProfilConnecteMock` et `MOCK_PROFIL` supprimés de `mockData.js`.

**Badge compte** (à droite du titre « Profil »)
- `ind_pro = 1` → **PRO** (texte rouge, fond rose clair)
- `ind_pro = 0` → **Gratuit** (texte gris, fond gris clair)

**Affichage**
- Rôle, entreprise, prénom, nom depuis la base locale.
- Message « Profil introuvable. » si aucune session active.

Les mocks du flux dimensions (métiers, ouvrages, brouillon) restent en place pour l’instant — on peut les remplacer ensuite si tu veux.

---

**User**

On clique sur Oui (Autre compte etait connecte..), effacer toute les donnees locales du précédent compte, et accepte la connexion

---

**Cursor**

Le flux « Oui » du modal changement de compte ne semble pas fonctionner correctement — j’examine le code pour corriger l’effacement local et la connexion.


Le bug vient de `loginTerrain` : après « Oui », il relance `assessTerrainLogin` alors que les données ne sont pas encore effacées, ce qui bloque la connexion. Je corrige en effaçant d’abord, puis en sautant la vérification de changement de compte.


Le problème venait de `loginTerrain` : après « Oui », il relançait la vérification **avant** l’effacement des données, détectait encore l’ancien compte et bloquait la connexion.

## Correction

Avec `wipeLocal: true` (bouton **Oui** du modal) :

1. **Effacement immédiat** de toutes les données locales
2. **Pas** de re-vérification « autre compte »
3. Vérification internet (comme une première connexion)
4. Appel Supabase + sync + connexion

En cliquant **Oui**, l’ancien compte est bien effacé et le nouveau compte se connecte. **Non** ne montre plus de message d’erreur.

---

**User**

@prompts_2.txt (26-27) 

---

**Cursor**

Connexion hors ligne pour un compte déjà enregistré localement : j’examine le flux d’auth actuel pour l’implémenter.


Je stocke le mot de passe localement après une connexion en ligne et j’active la reconnexion hors ligne pour le même compte.


La reconnexion **hors ligne** pour un compte déjà enregistré sur l’appareil est en place.

## Comportement

| Situation | Internet requis ? |
|-----------|-------------------|
| **Première connexion** (données locales vides) | Oui |
| **Même compte** déjà enregistré localement | **Non** |
| **Autre compte** (changement) | Oui (effacement + sync) |
| **En ligne** (même compte) | Sync Supabase comme avant |

## Mécanisme

- À la **première connexion en ligne**, le mot de passe est enregistré dans `terrain_device` (sur l’appareil uniquement).
- **Hors ligne**, si l’identifiant correspond au compte local, vérification locale du mot de passe → restauration de la session **sans appel Supabase**.
- Mauvais mot de passe → *« Identifiant ou mot de passe incorrect. »*
- Compte local sans mot de passe enregistré (mise à jour sans reconnexion en ligne) → *« Veuillez vous connecter pour une première connexion. »*

La re-vérification côté serveur pourra être ajoutée plus tard quand il y a internet, sans changer ce flux offline.

---

**User**

@prompts_2.txt (30-36) 

---

**Cursor**

Je remplace les mocks par les données SQLite sur les écrans mobile concernés — j’explore d’abord où ils sont utilisés.


Je mets à jour les requêtes locales et branche les écrans concernés.


Les données mock du catalogue ont été retirées et remplacées par SQLite sur les écrans mobile concernés.

## Changements

### Liste chantiers (`ListeChantiers.js`)
- Déjà branchée sur SQLite ; filtrage ajouté par **`entrepriseId`**
- Badge statut corrigé (`D` → « Dimension » au lieu de « Devis » par défaut)

### Nouvelle dimension (`NouvelleDimensionScreen.js`)
| Étape | Source locale |
|-------|----------------|
| Métiers | `getMetiersLocal()` → table `metiers` |
| Ouvrages | `getOuvragesByMetierAndEntreprise()` → table `ouvrages` |
| Unités | `getUnitesEtPrixParOuvrage()` → `ouvrage_unites` + `unites` |
| Édition récap | `getOuvrageUniteContextLocal()` |

### `querries.js`
- `getOuvrageUniteContextLocal()` — contexte métier/ouvrage/unité pour l’édition
- `getChantiersWithClientLocal(entrepriseId)` — filtre par entreprise
- `getUnitesEtPrixParOuvrage()` — inclut `ouvrage_id`, tri par nom

### `mockData.js`
- Suppression de tout le catalogue mock (`MOCK_METIERS`, `MOCK_OUVRAGES`, etc.)
- Conservation uniquement du **brouillon en mémoire** du flux dimensions (pas des données affichées)

### `App.js`
- Passage de `entrepriseId` à `ListeChantiers` et `NouvelleDimensionScreen`

`SelecteurMetierOuvrage` utilisait déjà les requêtes locales.

**Note :** métiers, ouvrages et unités doivent être synchronisés via le login Supabase. Si les listes sont vides, reconnectez-vous en ligne pour charger le catalogue.

---

**User**

Les unites et metiers sont obtenue de Supabase et sauvegarder en local


---

**Cursor**

Je vérifie comment métiers et unités sont synchronisés depuis Supabase vers SQLite.


Le flux Supabase → SQLite existe déjà au login ; je renforce la persistance locale et l’utilisation du catalogue synchronisé.


C’est en place. Voici comment **métiers** et **unités** circulent dans l’app :

## Flux Supabase → SQLite

1. **Connexion en ligne** (`terrain-login`)  
   Récupère tout le catalogue global :
   - `metiers` → table `metiers`
   - `unites` → table `unites`
   - + ouvrages, clients, etc. pour l’entreprise

2. **Sauvegarde locale** (`syncTerrainBootstrapLocal`)  
   Upsert dans SQLite à chaque login en ligne réussi.

3. **Hors ligne**  
   Métiers/unités restent en local (sync précédente). Pas de nouvelle requête Supabase.

## Affichage mobile

| Donnée | Source locale |
|--------|----------------|
| Métiers | `getMetiersForEntrepriseLocal()` — métiers sync Supabase ayant des ouvrages pour l’entreprise |
| Unités | `getUnitesEtPrixParOuvrage()` — jointure `ouvrage_unites` + `unites` (sync Supabase) |

## Contrôles ajoutés

- `ensureCatalogueLocal()` — vérifie que métiers/unités (et ouvrages) sont présents en local
- Login **offline** refusé si le catalogue n’a jamais été synchronisé
- Login **online** — warning si le catalogue est incomplet après sync

**Important :** métiers et unités doivent exister dans Supabase (écran admin web). Sans connexion en ligne au moins une fois, les listes resteront vides sur le téléphone.

---

**User**

@prompts_2.txt (39-40) 

---

**Cursor**

J'examine l'écran Plus et le flux de sync existant pour ajouter les boutons téléchargement et chargement Supabase.


J'ajoute la sync manuelle Supabase et les deux boutons dans l'écran Plus.


Deux boutons de sync ont été ajoutés dans le menu **Plus**.

## UI (colonne gauche, format recherche)

| Bouton | Icône | Action |
|--------|-------|--------|
| **Télécharger** | `cloud-download` | Télécharge depuis Supabase → SQLite |
| **Charger / Sync** | `sync` | Même opération (message de confirmation différent) |

- Format `FlowSmallFab` gris, comme la loupe sur Chantiers
- Déconnexion reste en grand FAB rouge à droite
- Les deux boutons se désactivent pendant une sync en cours

## Fonctionnement (`syncTerrainDataFromSupabase`)

1. Vérifie internet + identifiants enregistrés sur l’appareil
2. Appelle `terrain-login` avec le compte local
3. Met à jour SQLite (entreprise, catalogue, chantiers, clients, etc.)
4. Rafraîchit la session locale

## Messages

- Succès téléchargement : *« Données téléchargées depuis Supabase. »*
- Succès sync : *« Données chargées depuis Supabase. »*
- Erreurs : pas d’internet, compte jamais connecté en ligne, échec Supabase

**Prérequis :** une connexion en ligne au moins une fois pour enregistrer identifiant/mot de passe sur l’appareil.

---

**User**

@prompts_2.txt (43-45) 

---

**Cursor**

Les métiers/unités ne s’affichent pas après sync — j’analyse le pipeline de téléchargement et les requêtes locales pour trouver la cause.


Plusieurs causes possibles : conversion SQLite (booléens), métiers filtrés sans ouvrages, retour sync peu informatif. Je corrige la normalisation à l’import, l’affichage des métiers et les messages de sync.


J’ai corrigé plusieurs points qui expliquaient pourquoi les données n’apparaissaient pas.

## Causes probables

### 1. Chaîne de données incomplète dans Supabase
L’app ne synchronise les **`ouvrage_unites`** que si des **`ouvrages`** existent pour **votre entreprise** (`entreprise_id` du profil connecté).

Ordre requis dans Supabase :
1. **metiers** (catalogue global)
2. **unites** (catalogue global)
3. **ouvrages** → avec le bon **`entreprise_id`** + **`metier_id`**
4. **ouvrage_unites** → liés à ces ouvrages + unités

Sans **ouvrages** pour votre entreprise, les métiers ne s’affichaient pas et les unités ouvrage n’étaient pas téléchargées.

### 2. Filtre métiers trop strict
Les métiers n’étaient affichés que s’ils avaient déjà un ouvrage entreprise. **Corrigé** : fallback sur tous les métiers synchronisés en local.

### 3. Conversion Supabase → SQLite
Les booléens (`ind_dimension`, `_synced`, etc.) pouvaient faire échouer l’enregistrement SQLite. **Corrigé** avec une normalisation 0/1.

## Ce qui change pour vous

- Après **download/sync**, le message indique les comptes **local** et **Supabase** (ex. `3 métier(s), 2 unité(s), 0 ouvrage(s)`).
- Si `0 ouvrage(s)` → créez des **ouvrages** dans l’admin avec le **`entreprise_id`** de votre compte.
- Rouvrez le flux « nouvelle dimension » après sync pour recharger les listes.

## Checklist Supabase

| Table | Vérifier |
|-------|----------|
| `metiers` | Au moins 1 ligne |
| `unites` | `formule`, `nom`, `nom_unite` (≤ 10 car.) renseignés |
| `ouvrages` | `entreprise_id` = ID de **votre** entreprise |
| `ouvrage_unites` | `ouvrage_id` pointe vers un ouvrage de cette entreprise |

Refaites un **download** dans Plus : le message vous dira exactement ce qui a été reçu et enregistré. Si les comptes Supabase sont > 0 mais local = 0, dites-le moi avec le message affiché.

---

**User**

@prompts_2.txt (47-48) 

---

**Cursor**

Je cherche où la quantité est calculée sur le pavé numérique pour appliquer les règles `ind_unitaire` / `ind_dimension`.


Le pavé masquait les dimensions quand `ind_unitaire = 1` — je corrige la logique pour afficher l/h/n et appliquer les bonnes règles de quantité.


La logique du pavé et du calcul de quantité suit maintenant les règles demandées.

## Comportement

| `ind_unitaire` | `ind_dimension` | Pavé | Qté |
|----------------|-----------------|------|-----|
| **1** | **1** | l, h, n (selon formule) | **= n** (pas de calcul) |
| **0** | **1** | l, h, n | **= l × h × n** (via formule, ex. `L*H`) |
| * | **0** | n seulement | **= n** |

## Corrections

**Avant :** si `ind_unitaire = 1`, seul **n** était affiché (même avec `ind_dimension = 1`).

**Maintenant :** dès que `ind_dimension = 1`, les cotes **l / h** (et **p** si la formule le prévoit) sont saisies. Seul le calcul de la quantité change selon `ind_unitaire`.

Exemple avec `n = 3`, `l = 100 cm`, `h = 200 cm` :
- `ind_unitaire=1`, `ind_dimension=1` → **Qté = 3**
- `ind_unitaire=0`, `ind_dimension=1`, formule `L*H` → **Qté = 6** (1 m × 2 m × 3)

---

**User**

@prompts_2.txt (50-54) 

---

**Cursor**

Deux changements appliqués :

## 10. Nombre par défaut = 0
Sur le pavé de saisie (`PaveSaisieOneHand`) :
- **n** démarre à **0** (ouverture, après enregistrement, affichage des chips)
- L’enregistrement reste bloqué tant que **n > 0** (et les autres cotes requises sont renseignées)

## 11. Unité affichée = `nom_unite`
- **Récap** : `Qté 6.00 m²` utilise `nom_unite` (ex. `m²`, `u`, `ml`) au lieu du libellé long `nom`
- **Détail chantier** : même source via la requête SQL
- Les requêtes `getUnitesEtPrixParOuvrage` et `getOuvrageUniteContextLocal` exposent désormais `nom_unite`

Les lignes déjà en brouillon avec l’ancien `unite_nom` (= `nom`) restent compatibles grâce au fallback. Les nouvelles lignes utiliseront `nom_unite`.

---

**User**

@prompts_2.txt (56-58) 

---

**Cursor**

J'ajoute le formatage à 2 décimales et un composant carte partagé pour aligner récap et détails.


## Quantités — max 2 décimales
- `roundQuantite()` / `formatQuantite()` dans `formatLigneMesures.js`
- Calcul (`computeQuantiteLigneReleve`) arrondi à **2 décimales** à l’enregistrement
- Pavé, récap et détails affichent `Qté 6.00` (format uniforme)

## Cartes détail chantier = récap
Composant partagé **`LigneReleveCard`** :
- Nom ouvrage (gras)
- Mesures `l x h x n` à gauche
- `Qté XX.XX nom_unite` à droite
- Note en italique si présente

Utilisé dans **Récapitulatif** et **Détail chantier** — même mise en page.

---

**User**

@design.md (93-94) 

---

**Cursor**

Je regroupe les lignes par métier (tri alphabétique) dans le récap et les détails chantier.


Le regroupement par métier est en place dans le **récap** et le **détail chantier**, conformément à `design.md` (l.93–94).

### Ce qui a été branché

1. **Récap** (`NouvelleDimensionScreen`) — la liste plate est remplacée par `LignesReleveGroupedList` : sections par métier, tri alphabétique, tap pour éditer une ligne.

2. **Détail chantier** (`ChantierDetails`) — le `FlatList` est remplacé par `LignesReleveGroupedSections` avec le même regroupement + pull-to-refresh.

3. **Données** — chaque ligne enregistre `metier_id` / `metier_nom` ; les lignes chargées depuis SQLite via `getLignesByChantierLocal` incluent le métier ; les anciennes lignes sans métier tombent dans **« Autre »**.

### Comportement attendu

- Plusieurs métiers dans un même brouillon/chantier → en-têtes de section (ex. « Carrelage », « Plomberie ») triés A→Z.
- Édition d’une ligne → le métier est rechargé depuis le catalogue via `getOuvrageUniteContextLocal`.

Tu peux vérifier visuellement en ajoutant des dimensions sur 2+ métiers dans le récap, puis en ouvrant le chantier enregistré.

---

**User**

- les unites pres de quantite sont nom_unite

---

**Cursor**

Je vérifie où la quantité affiche l’unité pour m’assurer qu’on utilise bien `nom_unite`.


J’aligne l’affichage sur `nom_unite` partout (saisie, récap, détails) et je retire le repli sur `nom`.


L’unité affichée à côté de la quantité utilise désormais **`nom_unite`** partout (plus de repli sur `nom`).

### Modifications

- **Brouillon** (`NouvelleDimensionScreen`) — chaque ligne enregistre `nom_unite` depuis le catalogue.
- **Saisie** (`PaveSaisieOneHand`) — la ligne Qté affiche aussi `nom_unite` (ex. `Qté =  3.00 m²`).
- **Récap & détails** (`LigneReleveCard`) — affichage via `getLigneNomUnite()` qui lit `nom_unite` en priorité.
- **SQLite** (`getLignesByChantierLocal`) — la requête retourne directement `u.nom_unite` (plus d’alias `unite_nom`).

Les anciennes lignes de brouillon avec `unite_nom` restent compatibles le temps d’une session.

---

**User**

@prompts_2.txt (60-63) 

---

**Cursor**

Je regarde l'écran détail chantier et la navigation pour permuter Modifier/Devis, ouvrir le récap au clic Modifier, et ajouter Supprimer à gauche.


J’implémente le swap des FAB, la navigation vers le récap et la suppression du chantier.


Les trois points du prompt 13 sont en place.

### Swap Modifier / Devis (colonne droite)
- **Devis** (`file-document`, bleu) → bouton principal (grand, en bas)
- **Modifier** (`pencil`, jaune, icône noire) → petit bouton au-dessus

### Clic Modifier → récap
- Charge les lignes du chantier dans le brouillon via `startDraftFromChantierEdit`
- Ouvre `NouvelleDimensionScreen` directement sur l’étape **récap** avec les dimensions existantes (éditables au tap)

### Supprimer (colonne gauche)
- Bouton **delete** rouge à gauche
- Confirmation avant suppression
- Supprime le chantier en local (`deleteChantierLocal`, cascade relevés/lignes) puis retour à la liste

Fichiers touchés : `ChantierDetails.js`, `App.js`, `mockData.js`, `querries.js`.

---

**User**

- format de supprimer = recherche. FAB comme les autres a droite

---

**Cursor**

Je compare le FAB recherche avec le bouton supprimer actuel pour les aligner à droite.


Je remplace le gros FAB supprimer à gauche par un petit FAB à droite, comme la loupe de recherche.


Le bouton supprimer doit reprendre le style gris de la loupe, pas le rouge danger.


Le bouton **Supprimer** reprend le format de la loupe : petit `FlowSmallFab` gris, dans la colonne de droite.

**Colonne droite (bas → haut) :**
1. **Devis** — grand FAB bleu  
2. **Modifier** — petit FAB jaune  
3. **Supprimer** — petit FAB gris (comme recherche)

Le gros FAB rouge à gauche a été retiré. La confirmation avant suppression est inchangée.

---

**User**

- deplace le bouton supprimer dans recap (en bas de +)

---

**Cursor**

Je déplace le bouton supprimer vers le récap, sous le +, et je le retire des détails.


Le bouton **Supprimer** est maintenant dans le **récap**, pas dans les détails.

### Récap (`NouvelleDimensionScreen`)
- Petit FAB gris `delete` **sous le +** (même disposition que loupe / + sur la liste chantiers)
- Visible uniquement en **édition d’un chantier existant** (via Modifier depuis les détails)
- Confirmation avant suppression, puis retour à la liste chantiers

### Détails (`ChantierDetails`)
- Supprimer retiré — il ne reste que **Devis** (grand) et **Modifier** (petit) à droite

---

**User**

Lorsque enregistrer est cliquer durant la modification, garder les info client et chantiers. L utilisateur peut les modifier avant de sauvegarder.

---

**Cursor**

Je trace le flux Enregistrer en mode modification pour préremplir client et chantier dans le formulaire.


J’implémente le préremplissage du formulaire client/chantier et la mise à jour en base lors d’une modification.


En mode **modification**, le flux Enregistrer préserve et met à jour client/chantier correctement.

### Formulaire client/chantier
À l’ouverture depuis une édition, les champs sont **préremplis** depuis le brouillon :
- Nom et téléphone client  
- Nom, adresse et notes du chantier  
- Statut du chantier conservé  

L’utilisateur peut tout modifier avant de confirmer.

### Sauvegarde en modification
Si le brouillon contient un `chantierId` et un `releveId` existants :
- **Client** mis à jour (ou nouveau client si changement via recherche)
- **Chantier** mis à jour (pas de doublon)
- **Lignes** du relevé remplacées par celles du récap

### Nouveau chantier
Comportement inchangé : création client + chantier + relevé.

Flux : Détails → Modifier → Récap → **Enregistrer** → formulaire prérempli → confirmation → retour liste.

---

**User**

@prompts_2.txt (68-69) 

---

**Cursor**

J’ajoute la suppression au double-clic sur une ligne du récap, avec confirmation.


Dans le **récap**, le double-clic sur une ligne ouvre une confirmation avant suppression.

### Comportement
- **Simple clic** → édition (inchangé)
- **Double clic** → alerte « Supprimer "[ouvrage]" ? » → **Oui** retire la ligne du brouillon

### Détails techniques
- Détection double-clic dans `LigneReleveCard` (délai 350 ms, comme le bouton +)
- `removeLigneFromDraft` dans le brouillon
- Uniquement sur le récap — pas sur l’écran détails chantier

---

**User**

@prompts_2.txt (72-76) 

---

**Cursor**

Je parcours le schéma des lignes de relevé, l’écran détails et la sync pour ajouter notes, `ind_complete` et le barré au double-clic.


J’implémente les champs `note` et `ind_complete`, puis le comportement détails (**, modal, barré).


Les fonctionnalités du prompt 15 sont en place.

### Détails chantier
- **Note** → préfixe `**` devant le nom de l’ouvrage ; **clic** ouvre un modal lecture seule
- **Double-clic** → barré / débarré sur toute la carte (ouvrage, mesures, Qté)
- Pas d’affichage de la note sous la carte en mode détails (uniquement via le modal)

### Base de données
Nouveaux champs sur `ligne_releves` :
- `note` (TEXT)
- `ind_complete` (0 ou 1) — `1` quand la ligne est barrée

**Local** : schéma + migration SQLite au démarrage  
**Cloud** : `supabase/schema.sql` + migration `supabase/migrations/20260530120000_ligne_releves_note_ind_complete.sql`  
**Sync** : champs inclus dans `terrainSync.js`

### Persistance
- Toggle barré → `updateLigneReleveIndCompleteLocal` (immédiat en SQLite, `_synced = 0`)
- Enregistrement des dimensions → `note` et `ind_complete` conservés à la sauvegarde

### À faire côté Supabase
Exécuter la migration sur la base cloud existante (SQL Editor ou CLI) pour ajouter les colonnes aux projets déjà déployés.

---

**User**

les ** sont apres le nom de l ouvrage

---

**Cursor**

Les `**` s’affichent maintenant **après** le nom de l’ouvrage, par ex. `Porte salon **` au lieu de `** Porte salon`.

---

**User**

Au lieu de strickethrough, ajoute un watermark OK en vert au milieu de la card (pour ind_complete = 1) Transparent pour que ca soit en arriere des autres ecriture de la card

---

**Cursor**

Je remplace le barré par un filigrane « OK » vert transparent, centré derrière le contenu de la carte.


Le barré est remplacé par un filigrane **OK** vert (`#2B9348`), centré sur la carte, à ~28 % d’opacité, derrière le texte (`ind_complete = 1`).

Double-clic : filigrane affiché / masqué, comme avant avec `ind_complete`.

---

**User**

@prompts_2.txt (79-82) 

---

**Cursor**

J’explore l’écran détails, les cartes de mesure et ce qui existe déjà pour le devis et le partage.


J’implémente le layout Qté, l’affichage des prix au clic Devis, l’overlay d’export et la génération PDF.


Voici ce qui est en place pour le prompt 17 :

### Cartes (détails)
- **Qté** en haut à droite, puis ouvrage, mesures
- **Sans prix** par défaut
- **Clic Devis** → affichage du **P.U.** (`prix_unitaire_applique` déjà en base)

### Bouton Devis
- **Simple clic** → affiche les prix unitaires sur les cartes
- **Double clic** → fond grisé (comme la recherche chantiers) + 2 boutons :
  - **Télécharger** (bleu)
  - **WhatsApp** (vert)

### Export devis
- Génération **PDF** via `expo-print` (format classique : en-tête entreprise, date, client/projet, tableau désignation / dimension / qté / P.U / montant, totaux HT/TVA/TTC)
- **Télécharger** ou **WhatsApp** → feuille de partage système (enregistrer le PDF ou choisir WhatsApp)

### Dépendances ajoutées
`expo-print`, `expo-sharing`, `expo-file-system`

Le format complet du prompt 18 (logo, montant en lettres, signatures) pourra être ajouté ensuite sur cette base.

---

**User**

- CLique sur devis toggle on and off les prix. Les prix unitaires en bas de qté (meme alignement vertical) ne pas prendre plus d espace

---

**Cursor**

Je bascule les prix au clic Devis et aligne le P.U. sous la Qté dans la même colonne, sans agrandir la carte.


En récap, je retire la ligne P.U. réservée pour éviter l'espace inutile.


Modifications appliquées :

### Bouton Devis
- **Simple clic** → bascule l’affichage des prix (on/off)
- **Double clic** → overlay export (inchangé, force l’affichage des prix)

### Cartes détails
- **Qté** et **P.U.** empilés à droite, même colonne
- Ouvrage et mesures à gauche
- Le P.U. reste **sous la Qté** ; quand il est masqué, la ligne est invisible (`opacity: 0`) mais garde sa place → **pas de saut** de hauteur à l’activation/désactivation

---

**User**

Augemnt la taille des prix (mme taille que qté). ramene en bas

---

**Cursor**

Je remets le P.U. en bas de la carte, à la même taille que la Qté.


Layout mis à jour :

- **Qté** en haut à droite (inchangé)
- **P.U.** en **bas** de la carte, aligné à droite
- **Même taille** que la Qté (15 px, gras)
- Masqué avec `opacity: 0` quand les prix sont off → pas de saut de hauteur au toggle

---

**User**

Trop bas

---

**Cursor**

Je remonte le P.U. juste sous la Qté, à droite, en gardant la même taille de police.


Le **P.U.** est remonté : il est juste **sous la Qté**, en haut à droite (même colonne, même taille 15 px). Ouvrage et mesures restent à gauche.

---

**User**

meme ligne que les releves. qté meme ligne que ouvrage

---

**Cursor**

J’aligne ouvrage/Qté et mesures/P.U. sur deux lignes horizontales.


Layout en **2 lignes** :

1. **Ouvrage** à gauche · **Qté** à droite  
2. **Mesures** à gauche · **P.U.** à droite (détails, quand les prix sont visibles)

Même alignement horizontal pour ouvrage/Qté et mesures/P.U. Le récap utilise la 1re ligne (ouvrage + Qté) et la 2e avec les mesures seules.

---

**User**

Telecharger download dans fichier automatiquement 

---

**Cursor**

Le bouton **Télécharger** enregistre désormais le PDF directement, sans feuille de partage.

### Comportement
- **Android** : enregistrement dans **Téléchargements** (`Download`)
  - 1er téléchargement : demande d’accès au dossier (une fois)
  - Ensuite : enregistrement automatique au même endroit
- **iOS** : enregistrement dans `Documents/Devis/` de l’app (visible dans Fichiers)
- Confirmation avec le **nom du fichier** et le **dossier**
- **WhatsApp** : inchangé, via le partage système

Nom du fichier : `devis_[chantier]_[date].pdf`

