# Master screen update and redeploy
_Exported on 6/25/2026 at 20:58:07 GMT from Cursor (3.7.42)_

---

**User**

1. met a jours l ecran Master en tenant compte des nouveaux champs partout, mais aussi des tables supprimer (ex. metier_entreprise). Puis redeploy losange-master.expo.app

---

**Cursor**

Je vais d’abord examiner l’écran Master, le schéma (tables supprimées comme `metier_entreprise`) et la config de déploiement Expo.


Je complète les champs manquants dans MasterScreen, puis je lance le déploiement.


Le build web est prêt (Master uniquement, sans SQLite). Je relance le déploiement en production avec votre approbation.


Mise à jour de l’écran Master et déploiement terminés.

## Écran Master (`MasterScreen.js`)

**Table supprimée**
- `metiers_entreprise` retirée (sidebar, schémas, clés composites, labels)

**Métiers** (champs fusionnés depuis l’ancienne table de liaison)
- `entreprise_id` (obligatoire), `ordre`, `ind_actif`, `ind_default`
- Liste : nom + entreprise ; sous-titre ordre / actif

**Entreprises**
- `ind_admin_connecte_mobile`, `ind_metiers_preselectionnes` (section Onboarding)

**Ouvrages**
- `ind_actif`, `ordre` (section Catalogue)

**Relevés**
- `status` (E / V / N)
- `ind_tva` en toggle binaire

**Lignes relevés**
- `ind_complete` en toggle binaire

**Backend admin** (`supabaseAdmin.js`, `master-admin-crud`)
- `metiers_entreprise` retirée
- `metiers` ajouté aux soft deletes (filtre `supprime_le IS NULL`)

## Déploiement

- Export web OK
- Production : **https://losange-master.expo.app**

---

**Note :** la fonction Edge `master-admin-crud` (filtre soft delete sur `metiers`) doit être redéployée côté Supabase si ce n’est pas déjà fait :

```bash
supabase functions deploy master-admin-crud
```

---

**User**

JE ne suis pas capable d ajouter dans le champ chantier (Clietn et Chantier) sur mobile

---

**Cursor**

Je vais examiner le flux mobile Client/Chantier pour identifier ce qui bloque l’ajout.


Le champ « Nom du chantier » est désactivé tant qu’aucun client existant n’est sélectionné, alors que la création d’un nouveau client est pourtant supportée. Je corrige ça.


Le blocage venait d’une règle trop stricte dans le formulaire **Client et chantier**.

## Cause

Le champ **Nom du chantier** était désactivé tant qu’aucun **client existant** n’était choisi dans la liste (`editable={Boolean(resolvedClientId)}`).

Or, si vous tapiez un **nouveau client** (nom + téléphone) sans le sélectionner dans les suggestions, le chantier restait verrouillé — alors que l’enregistrement côté base sait bien créer un nouveau client.

## Correction

Le chantier devient saisissable dès que :
- un client existant est sélectionné, **ou**
- le **nom** et le **téléphone** du client sont renseignés (nouveau client).

Les messages d’aide ont été mis à jour en conséquence. En cas d’échec à l’enregistrement (ex. limite compte gratuit), le message d’erreur réel s’affiche maintenant.

## Comment tester

1. Nouveau client : saisir nom + téléphone → le champ chantier se débloque → remplir le chantier → **Enregistrer**
2. Client existant : choisir dans la liste → saisir ou choisir un chantier → **Enregistrer**

Rechargez l’app (`npm start` déjà actif) et retestez le flux dimension.

---

**User**

13. Pour profil C et T, dans le menu Plus mobile, ne pas montrer le telephone du client

---

**Cursor**

J’ajoute une règle d’accès et je masque le téléphone client dans la liste Plus pour les profils C et T.


C’est en place pour les profils **C** (chantier) et **T** (atelier) dans le menu **Plus → Base de données → Clients**.

## Changements

**`terrainAccess.js`** — nouvelle règle `canSeeClientPhone` (même logique que le masquage des prix : C et T exclus).

**`ListeClientsScreen.js`**
- Affichage : **nom seul** pour C/T (plus de `Nom / téléphone`)
- Recherche : les numéros ne sont plus utilisés comme critère pour C/T

Les profils **A** et **S** voient toujours le téléphone comme avant. Les détails client restent réservés à l’admin (A) — C/T ne peuvent pas y accéder.

---

**User**

profil C et T ne peux pas changer le status du releve. No action si double click

---

**Cursor**

Les profils C et T peuvent encore modifier le statut de leurs propres relevés — j’ajoute une restriction dédiée.


Les profils **C** et **T** ne peuvent plus changer le statut d’un relevé (E → V → N) au double-clic.

## Changements

**`terrainAccess.js`** — nouvelle règle `canChangeReleveStatus` (refusée pour C et T).

**UI**
- **Détail chantier** et **liste des relevés** : le badge statut n’est plus cliquable pour C/T (double-clic sans effet).
- Le badge reste visible en lecture seule.

**Base locale** — `updateReleveStatusLocal` bloque aussi la modification côté données, même si l’UI était contournée.

Les profils **A** et **S** conservent le double-clic pour faire tourner le statut sur leurs relevés autorisés.

---

**User**

Dans webapp, renomme Clients et chantiers comme Clients, chantiers, devis

---

**Cursor**

C’est fait. La section s’appelle maintenant **« Clients, chantiers, devis »** partout dans la webapp admin :

- **Menu latéral** (`adminNav.js` — constante `CLIENTS_SECTION_LABEL`)
- **Titres de page** (`/clients`, `/clients/[id]`, `/clients/[id]/chantiers/[id]`)

Les pages enfants utilisent la même constante pour rester alignées si le libellé change à nouveau.

---

**User**

increase width of sidebar

---

**Cursor**

J’élargis la sidebar de la webapp admin pour le libellé « Clients, chantiers, devis ».


La sidebar de la webapp admin passe de **260px** à **300px**, via une variable CSS `--sidebar-width` utilisée aussi pour le décalage du contenu principal.

Si vous voulez une autre largeur (ex. 320px), dites-le.

---

**User**

what is wrong with you. je ne vois pas de metier dans le webapp, alors que j ai choisi des metiers! 

---

**Cursor**

Je vais tracer comment la webapp charge les métiers et comparer avec le schéma actuel (métiers liés à l’entreprise).


La webapp interroge encore l’ancienne table `metiers_entreprise` (supprimée) au lieu de `metiers.entreprise_id`. Je corrige les requêtes et la synchro mobile pour réparer les données cloud.


La webapp lisait encore `metiers_entreprise` (table supprimée). Je corrige la synchro pour que les métiers présélectionnés remontent bien sur Supabase.


Vous aviez raison d’être agacé : la webapp lisait encore l’**ancienne table `metiers_entreprise`**, supprimée lors du refactor (prompt 18). Les métiers choisis sur mobile sont bien dans `metiers` avec `entreprise_id`, donc la webapp ne les trouvait pas.

## Cause

| Mobile (OK) | Webapp (cassé) |
|-------------|----------------|
| Métiers dans `metiers` + `entreprise_id` | Requête sur `metiers_entreprise` (table supprimée) |

Résultat : liste vide dans **Métiers, ouvrages, articles**, alors que le mobile affiche vos métiers.

## Corrections

**Webapp** (`lib/metiers/queries.js`) — lecture directe de `metiers` filtrés par `entreprise_id`.

**Mobile / sync**
- Métiers bien appliqués au login (gratuit et Pro)
- Action cloud `repair_metiers` si les métiers sont locaux mais absents du cloud
- Réparation automatique à la reconnexion admin si le cloud est vide
- Contrôle après présélection : erreur si le cloud n’a pas reçu les métiers

## À faire de votre côté

1. **Redémarrer la webapp admin** (si `npm run dev` tourne déjà) pour charger le fix.
2. **Redéployer la fonction Edge** `terrain-sync` (nouvelle action `repair_metiers`) :
   ```bash
   supabase functions deploy terrain-sync
   ```
3. **Sur mobile** : déconnectez-vous puis reconnectez-vous en admin — les métiers locaux seront poussés vers Supabase si le cloud est vide.
4. **Rafraîchir la webapp** : section **Métiers, ouvrages, articles**.

Si la liste est toujours vide après ça, ouvrez l’écran Master → table **Métiers** et vérifiez que vos lignes ont bien un `entreprise_id` renseigné. Dites-moi ce que vous voyez.

---

**User**

Dans webapp, lors de modifier devis, affiche les dimensions devant l ouvrage (tel qu elles apparaissent sur devis)

---

**Cursor**

Je cherche où le devis est modifié dans la webapp et comment les dimensions y sont affichées sur le document.


J’aligne la colonne Ouvrage de l’écran « modifier devis » sur le PDF : nom de l’ouvrage puis dimensions en dessous.


Sur le PDF devis, l’ouvrage est au-dessus des dimensions — je corrige l’ordre pour correspondre.


C’est en place. Sur **Modifier devis**, la colonne **Ouvrage** reprend la même présentation que le PDF :

1. **Nom de l’ouvrage** (gras)
2. **Dimensions** en dessous (ex. `120 x 80` pour les lignes dimensionnelles), via la même fonction `formatDevisDimension` que le devis

Pour les lignes unitaires (`ind_dimension = 0`), seul le nom de l’ouvrage s’affiche — comme sur le devis.

Rafraîchissez la page de modification du devis pour voir le changement (le serveur dev devrait recharger automatiquement).

---

**User**

sur mobile, S ne peut activer ou desactiver, ou changer l ordre des ouvrage. Seul admin peut faire ca

---

**Cursor**

Je cherche où le mobile gère l’activation, la désactivation et l’ordre des ouvrages, et comment le profil S est défini dans les règles d’accès.


J’ajoute les règles d’accès admin-only et je les applique dans `ListeOuvragesScreen`.


C’est en place pour le profil **S** sur l’écran **Base de données → Ouvrages / Articles**.

## Comportement

| Action | Admin (A) | Commercial S |
|--------|-----------|----------------|
| Voir la liste | Oui | Oui |
| Ouvrir / modifier un ouvrage | Oui | Oui |
| Cocher / décocher (actif pour prise de cotes) | Oui | **Non** (case masquée) |
| Réordonner (glisser-déposer) | Oui | **Non** |

## Modifications

- **`terrainAccess.js`** : `canToggleOuvrageActif` et `canReorderOuvrages` réservés à l’admin.
- **`ListeOuvragesScreen.js`** : selon le profil connecté, pas de checkbox ni de poignée de drag ; sous-titre adapté pour S.

Rechargez l’app mobile pour tester avec un compte S.

---

**User**

il ne peut pas aussi supprimer ouvrage

---

**Cursor**

J’ajoute la restriction de suppression pour le profil S dans les règles d’accès et sur l’écran détail ouvrage.


C’est fait. Le profil **S** ne peut plus supprimer un ouvrage ou un article.

- **`canDeleteOuvrage`** : réservé à l’admin (A), comme activer/désactiver et réordonner.
- **`OuvrageDetailsScreen`** : le bouton supprimer (FAB poubelle) est masqué pour S ; la modification reste possible via le bouton **Modifier** en bas à droite.

Rechargez l’app mobile pour tester avec un compte S.

---

**User**

Ne peux pas changer le nom et l unite de l ouvrage. Change juste le prix unitaire

---

**Cursor**

Je limite le profil S à la modification du prix unitaire dans le formulaire ouvrage.


C’est en place pour le profil **S** dans **Base de données → Ouvrage → Modifier**.

## Comportement profil S

| Champ | Admin (A) | Commercial S |
|--------|-----------|----------------|
| Nom ouvrage / article | Modifiable | Lecture seule |
| Fournisseur (article) | Modifiable | Lecture seule |
| Unité | Modifiable | Lecture seule |
| **Prix unitaire** | Modifiable | **Modifiable** |

Le titre du modal devient **« Modifier le prix de l'ouvrage »** pour S. À l’enregistrement, seul le prix est envoyé ; nom et unité restent ceux d’origine.

Rechargez l’app mobile pour tester.

---

**User**

@prompts_2.md (3-9) 

---

**Cursor**

Je explore la webapp admin pour appliquer les changements du tableau de bord.


Je mets en place le tableau de bord : navigation, requêtes stats et cartes.


C’est en place dans la webapp admin.

## Navigation
- **Paramètres** retiré du menu
- **Accueil** remplacé par **Tableau de bord** (`/tableau-de-bord`)
- Premier item du menu : **Bonjour {prénom}** (sidebar + en-tête de page)
- `/accueil` redirige vers `/tableau-de-bord` ; connexion aussi

## Tableau de bord — 3 cartes colorées avec icônes

| Carte | Contenu |
|--------|---------|
| **Chantiers** (bleu) | Total + détail par statut (Relevé, Devis, En cours, Terminé, Annulé) |
| **Devis** (orange) | Total relevés + détail par statut (En attente, Validé, Non-validé) |
| **Montants HT** (vert) | Total, moyenne générale, total et moyenne par statut de devis |

Les montants utilisent `total_ht_facture` des relevés. Pour le profil **T**, les stats respectent le même filtre que la liste des chantiers (ses chantiers uniquement).

Rafraîchissez la webapp — vous devriez arriver directement sur le tableau de bord après connexion.

---

**User**

Pas de filtre pour T au tableau de bord (tous les chantiers)

---

**Cursor**

Je retire le filtre profil T du tableau de bord pour afficher tous les chantiers de l'entreprise.


C’est corrigé. Le tableau de bord charge désormais **tous les chantiers de l’entreprise**, sans filtre par profil **T**.

Le filtre T reste actif uniquement dans les listes de chantiers (navigation clients), pas sur le dashboard. Rafraîchissez la page pour voir les stats complètes.

---

**User**

Je n aime pas le layout des cards. 1 card par ligne. Ex. pour Chantiers, Chantiers centré en haut avec total. En bas (sur toute la ligne), les comptes par status. Devis est un seul card (nombres puis montant HT)

---

**Cursor**

Je refonds le layout : une carte pleine largeur par section, avec Chantiers centré en haut et Devis regroupant effectifs puis montants HT.


Layout refait : **2 cartes pleine largeur**, une par ligne.

## Chantiers (bleu)
- En haut, centré : icône → **Chantiers** → total
- En bas, sur toute la largeur : 5 colonnes (Relevé, Devis, En cours, Terminé, Annulé) avec pastille de couleur, chiffre et libellé

## Devis (orange) — une seule carte
1. **Haut** : icône → **Devis** → total de devis  
2. **Bandeau** : effectifs par statut (En attente, Validé, Non-validé)  
3. **Montants HT** : total + moyenne côte à côte  
4. **Bandeau bas** : montant HT par statut, avec détail « X devis · moy. … »

Sur mobile, les bandeaux passent en grille 2 colonnes. Rafraîchissez la page pour voir le nouveau layout.

---

**User**

Écrit tableau de bord (au font a droit - près de deconnecter Bonjour x. Deconnecter en icon seulement)

---

**Cursor**

C’est en place dans la barre du haut à droite :

**Tableau de bord** · **Bonjour {prénom}** · icône déconnexion (sans texte, avec `aria-label` au survol)

Autres ajustements :
- Sidebar : l’entrée redevient **Tableau de bord** (plus « Bonjour »)
- Page dashboard : navbar interne retirée pour éviter le doublon
- Titre de page dynamique selon la section (Clients, Métiers, Profil, etc.)

Rafraîchissez la webapp pour voir le changement.

---

**User**

Titres des cards et nombre sur 1 ligne. Reduit size des cards

---

**Cursor**

C’est mis à jour :

- **En-tête de carte** : icône + **Chantiers 12** (ou **Devis 8**) sur une seule ligne, centrée
- **Cartes plus compactes** : padding réduit, coins 12px, icône 36px, total ~1.35rem
- **Bandeaux statuts** : chiffre et libellé sur la même ligne (ex. `5 Relevé`)
- **Montants HT** : libellé et montant sur une ligne (ex. `Montant total HT 1 250 000 FCFA`)

Rafraîchissez la page pour voir le résultat.

---

**User**

Revert back au layout precedent pour les nav (je n aime pas celui la)

---

**Cursor**

Je restaure la navigation comme avant les changements d'en-tête (Bonjour x, titre et icône de déconnexion).


Navigation rétablie comme avant le changement d’en-tête :

- **Barre du haut** : logo + nom entreprise à gauche, bouton **Se déconnecter** (texte) à droite
- **Sidebar** : **Bonjour {prénom}** sur le premier item (tableau de bord)
- **Page dashboard** : navbar avec **Bonjour {prénom}** réaffichée

Les cartes statistiques restent inchangées. Rafraîchissez la page pour voir le layout.

---

**User**

enleve montant moyens

---

**Cursor**

C’est fait. Les montants moyens ont été retirés :

- Plus de **Moyenne HT** dans la carte Devis
- Plus de **moy. …** par statut — seulement le nombre de devis et le montant total HT

Il reste **Montant total HT** global et les totaux HT par statut.

---

**User**

en bas des montants, enleve le snombres

---

**Cursor**

C’est fait. Sous les montants HT par statut, les lignes « X devis » ont été retirées. Il ne reste que le montant et le libellé du statut (En attente, Validé, Non-validé).

---

**User**

agugement size des cards un peu

---

**Cursor**

J’ai légèrement agrandi les cartes : plus de padding, icônes et chiffres un peu plus grands, bandeaux de statuts et montants un peu plus aérés. Rafraîchissez la page pour voir le résultat.

---

**User**

lorsque un nouveau revele est ajoute au meme chantier, le nombre des releve (releve 1, releve 2, etc) est en ordre inverse. ca doit etre incremental (1, puis 2, etc) pour les nouveaux, meme si on veut un affichage decroissant (dans mobile et webapp)

---

**Cursor**

Je cherche où les numéros de relevé sont calculés et affichés sur mobile et webapp.


Je corrige la numérotation : elle doit suivre l'ordre de création (1, 2, 3…), même si l'affichage reste décroissant.


C’est corrigé. La numérotation est maintenant **fixée à la création**, indépendamment de l’ordre d’affichage.

## Logique
- **Relevé 1** = premier relevé créé sur le chantier  
- **Relevé 2** = second, etc.  
- **Affichage** : toujours du plus récent au plus ancien  

## Cause
Sur la **webapp**, on utilisait `index + 1` sur une liste triée du plus récent au plus ancien → le nouveau relevé devenait « Relevé 1 ».

## Correctif
Utilitaire `withReleveNumbers` (mobile + webapp) qui :
1. Numérote par `cree_le` croissant  
2. Trie l’affichage par `cree_le` décroissant  
3. Attache un champ `numero` stable à chaque relevé  

**Mobile** : `getRelevesByChantierLocal` + affichage `Relevé {numero}`  
**Webapp** : `fetchRelevesByChantierIds` + `Relevé / Devis {numero}`

Exemple avec 2 relevés : le plus récent s’affiche en haut comme **Relevé 2**, l’ancien en dessous comme **Relevé 1**.

---

**User**

Pour quoi dans le mobile, souvent apres un reload, j obtient l ecran de choix de metier comme durant la premiere utilisation alors que les metiers avait deja ete selectionne. Cela n est pas normal!

---

**Cursor**

Je trace le flux de présélection des métiers au reload pour comprendre pourquoi l'écran réapparaît.


Cause identifiée : `ind_metiers_preselectionnes` n'était pas inclus dans les colonnes synchronisées — le flag restait à 0 après la présélection. Correction en cours.


Évitant une dépendance circulaire en déplaçant `markMetiersPreselectedLocal` vers `metiersPreselection.js`.


**Cause du bug**

Au redémarrage, l’app décide d’afficher ou non l’écran « Choisissez vos métiers » via `getMetierPreselectionRequiredLocal()`, qui lit le flag local `ind_metiers_preselectionnes` sur la table `entreprises`.

Or, après la présélection, ce flag **n’était jamais enregistré en local** : la colonne `ind_metiers_preselectionnes` était absente de `TABLE_COLUMNS` dans `terrainSync.js`. Lors du `upsertRows` après sync ou présélection, le flag renvoyé par le cloud (`= 1`) était ignoré et restait à `0` (valeur par défaut).

Résultat :
1. Première utilisation → vous choisissez vos métiers → l’écran se ferme (le modal ne revérifie pas le flag).
2. Reload → le flag local vaut toujours `0` → l’écran réapparaît alors que les métiers existent déjà.

**Corrections appliquées**

1. **`terrainSync.js`** — Ajout de `ind_metiers_preselectionnes` et `ind_admin_connecte_mobile` aux colonnes synchronisées de `entreprises`, pour que le flag soit bien persisté lors des syncs.

2. **`getMetierPreselectionRequiredLocal()`** — Si l’entreprise a déjà des métiers actifs en local, on considère la présélection comme faite (retour `false`) et on corrige automatiquement le flag à `1` (rattrapage pour les sessions déjà affectées).

3. **`loginTerrain`** — Utilise la même logique locale après sync, au lieu de se fier uniquement au flag distant.

4. **`preselectMetiersRemote`** — Force explicitement le flag local à `1` après une présélection réussie.

**Test**

Rechargez l’app (`r` dans Metro ou relance complète) : vous devriez arriver directement sur la liste des chantiers, sans repasser par l’écran de choix des métiers.

