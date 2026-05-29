# Fiche Contexte Projet : LOSANGE (Mobile)

## 1. Vision du Projet

**Losange** est une application mobile d'Afrique de l'Ouest (marché cible : Mali) conçue pour remplacer le carnet de notes papier des professionnels et artisans du Bâtiment et des Travaux Publics (BTP). 

L'application répond à deux besoins majeurs :

1. **Sur le terrain :** Permettre aux métreurs, techniciens et chefs de chantier de saisir instantanément les dimensions et quantités relevées sur le site, sans connexion internet (**Offline-First**).
2. **Au bureau :** Générer automatiquement un devis estimatif propre (format PDF) dès que les cotes sont validées, en y associant la liste des prix unitaires de l'entreprise.

---

## 2. Contraintes UI/UX Critiques ("Terrain & Une Main")

Le design de l'application mobile est dicté par des conditions réelles de chantier (poussière, chaleur, une main occupée par un mètre ruban ou un outil) :

- **Thumb-Driven Design (Utilisation à une main) :** 100 % des composants interactifs critiques (boutons de sélection, grilles de métiers, validation) doivent être positionnés sur le tiers inférieur de l'écran, facilement accessibles avec le pouce.
- **Zéro Clavier Natif :** Pour saisir les dimensions (Largeur, Hauteur, Profondeur, Nombre), l'application ne doit **JAMAIS** ouvrir le clavier par défaut du système (iOS/Android). Un pavé numérique géant intégré à l'interface en bas d'écran doit être utilisé exclusivement.
- **Lisibilité Extrême :** Contraste très élevé, fonds clairs (lisibles sous le soleil de Bamako), gros caractères et utilisation massive d'icônes explicites pour les ouvriers moins lettrés.

---

## 3. Flux Opérationnel de l'Application

L'ordre logique de saisie sur le terrain suit strictement ce parcours :

1. **Sélection du Métier d'abord :** L'utilisateur clique sur le métier concerné (Menuiserie Aluminium, Maçonnerie, Peinture, Carrelage, Plomberie, Électricité, Divers). Cela filtre dynamiquement l'interface.
2. **Saisie des Cotes & Ouvrage :** Choix de l'ouvrage spécifique de l'entreprise (ex: *Fenêtre Coulissante*) et saisie des dimensions via le pavé numérique dédié.
3. **Clôture et Attribution :** Une fois le relevé terminé, l'utilisateur lie l'ensemble des mesures à un **Client** et un **Chantier** (Un client peut avoir plusieurs chantiers).

---

## 4. Architecture Technique Mobile

- **Framework :** React Native via Expo (SDK 54).
- **Langage :** JavaScript pur (fichiers `.js`, pas de TypeScript).
- **UI Framework :** React Native Paper & NativeWind (Tailwind CSS v4).
- **Base de données locale :** `expo-sqlite` (SQLite brut).
- **Gestion des Identifiants :** UUID v4 générés côté client sur le téléphone (indispensable pour l'offline).
- **Indicateur de Synchronisation :** Chaque table transactionnelle intègre une colonne `_synced` (`0` = Donnée locale non envoyée au Cloud, `1` = Donnée synchronisée avec Supabase).

---

## 5. Schéma de la Base de Données Locale (Normalisé)

Les tables locales SQLite reflètent le modèle de données final (épuré des redondances) :

- **Configuration / Catalogue (Unidirectionnel Cloud ➔ Mobile) :**
  - `metiers` : Liste globale des corps d'état (nom, abbrev, icon).
  - `unites` : Types de mesures (nom, symbole, formule, `ind_dimension` [1 = Formulaire L x H, 0 = Quantité Directe]).
  - `ouvrages` : Articles propres à chaque PME (id, metier_id, entreprise_id, nom).
  - `ouvrage_unites` : Liaison Pivot Tarifaire (id, ouvrage_id, unite_id, prix_unitaire). *Note : L'ouvrage étant lié à l'entreprise, cette table hérite de la gérance privée sans colonne redondante.*
- **Transactionnel Terrain (Bidirectionnel Mobile ⇄ Cloud) :**
  - `entreprises` : Informations de la PME utilisatrice.
  - `profils` : Identité et rôles des utilisateurs (Admin, Chantier, Atelier, Commercial).
  - `clients` : Carnet d'adresses clients de l'entreprise (`_synced`).
  - `chantiers` : Projets rattachés aux clients (nom, adresse, status [`Devis`, `En cours`, `Terminé`, `Annulé`], `_synced`).
  - `releves` : En-tête du groupe de cotes d'un chantier (totaux HT, TVA 18% Mali, totaux TTC, `_synced`).
  - `ligne_releves` : Les dimensions pures (largeur, hauteur, profondeur, nombre, quantite calculée/directe, prix_unitaire_applique, montant calculé, `_synced`).

---

## 6. Instructions de Codage pour l'IA (Cursor)

Lorsque tu génères ou modifies du code pour ce projet :

1. Reste aligné à 100 % avec les requêtes asynchrones définies dans `src/db/queries.js`.
2. Ne propose aucun type statique ou syntaxe TypeScript.
3. Applique systématiquement les styles NativeWind en pensant à l'accessibilité du pouce en bas d'écran (`justify-end`, `pb-6`, etc.).
4. Assure-toi que la colonne `montant` d'une ligne et les totaux d'un relevé soient mis à jour dynamiquement à l'écriture.

