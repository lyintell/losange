# Losange — Description du projet

> Document de synthèse pour présentation externe (investisseurs, gestionnaires de projet, partenaires).  
> Version simplifiée de `prompts/Projet.md`.

---

## 1. En bref

**Losange** est une application mobile conçue pour le **BTP en Afrique de l’Ouest** (marché prioritaire : **Mali**). Elle remplace le **carnet papier** utilisé sur chantier pour relever dimensions, quantités et ouvrages, et permet de **générer automatiquement un devis PDF** dès que les mesures sont validées.

**Promesse :** saisir vite sur le terrain, même sans internet — produire un devis propre au bureau, sans ressaisie.

---

## 2. Problème adressé

Sur les chantiers au Mali et en Afrique de l’Ouest, les professionnels du BTP (menuiserie, maçonnerie, peinture, plomberie, etc.) :

- notent les cotes à la main sur des carnets ;
- perdent du temps à recopier les mesures au bureau ;
- produisent des devis hétérogènes, parfois incomplets ;
- travaillent souvent **sans connexion internet** fiable.

Losange digitalise ce flux de bout en bout, en restant utilisable **hors ligne**.

---

## 3. Solution proposée

Losange couvre deux moments clés :

| Moment | Besoin | Réponse Losange |
|--------|--------|-----------------|
| **Sur le terrain** | Relever rapidement dimensions et quantités | Saisie guidée par métier et ouvrage, pavé numérique dédié, mode offline |
| **Au bureau / chez le client** | Présenter un devis clair et chiffré | Génération PDF automatique à partir des prix unitaires de l’entreprise |

L’application s’adresse aux **PME et artisans du BTP** qui veulent professionnaliser leur prise de cotes et leur facturation estimative.

---

## 4. Marché cible

- **Géographie :** Afrique de l’Ouest, avec un focus initial sur le **Mali** (contexte fiscal local : TVA 18 %).
- **Utilisateurs :** entreprises de menuiserie aluminium, maçonnerie, peinture, carrelage, plomberie, électricité, travaux divers.
- **Profils terrain :** métreurs, techniciens, chefs de chantier, commerciaux, responsables d’atelier.

---

## 5. Parcours utilisateur principal

1. **Choisir un métier** (ex. Menuiserie, Maçonnerie, Peinture…) — filtre le catalogue de l’entreprise.
2. **Choisir un ouvrage ou un article** (ex. Fenêtre coulissante, peinture acrylique…) avec son unité de mesure.
3. **Saisir les dimensions** via un pavé numérique intégré (largeur, hauteur, épaisseur, nombre selon l’unité).
4. **Consulter le récapitulatif** des lignes relevées.
5. **Associer client et chantier** (un client peut avoir plusieurs chantiers).
6. **Ajuster remise et TVA** (selon droits et formule choisie).
7. **Exporter le devis** en PDF (téléchargement ou partage WhatsApp).

Statuts de chantier : **Dimension → Devis → En cours → Terminé / Annulé**.

---

## 6. Fonctionnalités clés

### Relevé de cotes (cœur produit)

- Catalogue par **métier** et par **entreprise** (ouvrages + articles avec fournisseur).
- Unités variées : quantité directe ou formules dimensionnelles (L×H, L×H×E×N, m², etc.).
- Calcul automatique des **quantités** et **montants** par ligne.
- Notes et photos par ligne ou par chantier.
- Récapitulatif avant enregistrement.

### Gestion commerciale

- **Clients** et **chantiers** avec recherche intégrée.
- **Remise** par relevé (montant en FCFA).
- **TVA activable ou non** par facture/relevé (indépendamment du réglage entreprise).
- Totaux affichés : remise, HT, TVA, TTC.

### Documents exportables

- **Devis PDF** : tableau des ouvrages, totaux, montant en lettres, logo entreprise (offre Pro).
- **PDF relevé de dimensions** : document technique sans focus prix (selon profil utilisateur).

### Administration & catalogue

- Gestion des **ouvrages**, **articles**, **fournisseurs**, **prix unitaires**.
- Paramétrage entreprise (nom, logo, option TVA par défaut).
- Interface web **Master Admin** pour supervision multi-entreprises (back-office).

### Synchronisation cloud

- Données terrain stockées **localement** sur le téléphone (fonctionnement offline).
- Synchronisation bidirectionnelle avec le cloud (**Supabase**) pour comptes Pro.
- Indicateur de données non synchronisées.

---

## 7. Principes de design (différenciation UX)

Losange est pensé pour les **conditions réelles de chantier** :

- **Une main libre :** boutons d’action dans le tiers inférieur de l’écran (thumb-driven design).
- **Zéro clavier système** pour les cotes : pavé numérique géant intégré.
- **Lisibilité maximale :** grands textes, contrastes élevés, fonds clairs (lisibles en plein soleil).
- **Simplicité visuelle :** icônes explicites pour utilisateurs peu lettrés.

Ces choix ne sont pas esthétiques seulement : ils réduisent les erreurs et accélèrent la saisie sur site.

---

## 8. Rôles utilisateurs

| Code | Rôle | Périmètre typique |
|------|------|-------------------|
| **A** | Admin | Accès complet : tous chantiers, catalogue, profils, rapports |
| **S** | Superviseur / Atelier | Voit tous les chantiers ; ajuste prix et infos client ; ne crée pas de nouvelles lignes |
| **C** | Commercial | Voit ses propres chantiers ; peut créer ouvrages (PU fixé à 1) ; pas de prix visibles |
| **T** | Technicien / Chantier | Même logique que Commercial sur le terrain |

Les droits contrôlent : visibilité des prix, export devis, modification des chantiers des autres, accès au rapport, gestion du catalogue.

---

## 9. Modèle économique (Freemium)

### Offre Gratuite

- Limites : 10 clients, 10 chantiers, 1 utilisateur, 3 métiers, 10 ouvrages/métier.
- Pas de synchronisation cloud (hors entreprise/profil).
- Pas de TVA ni logo sur le devis.
- Pas de partage WhatsApp (téléchargement seulement).
- Pas de rapport analytique.

### Offre Pro

- Limites levées, synchronisation cloud complète.
- TVA, logo, partage WhatsApp, validation ligne par ligne (double tap).
- Rapports (selon rôle).
- Passage Gratuit ↔ Pro géré depuis l’écran Master Admin.

---

## 10. Architecture produit (vue haute niveau)

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Application mobile | React Native / Expo | Interface terrain Android (iOS possible) |
| Base locale | SQLite | Stockage offline, performance instantanée |
| Backend cloud | Supabase | Auth, sync, admin web |
| Export | PDF natif | Devis et relevés partageables |

**Principe offline-first :** chaque mesure est enregistrée immédiatement sur le téléphone ; la sync cloud intervient quand la connexion est disponible (comptes Pro).

---

## 11. Données métier (conceptuel)

- **Catalogue entreprise :** métiers, unités, ouvrages, articles, fournisseurs, prix unitaires.
- **Transactionnel :** clients, chantiers, relevés (en-tête avec totaux, remise, TVA), lignes de relevé (dimensions + montants).
- **Utilisateurs :** profils liés à une entreprise, avec rôle et droits.

Un **relevé** regroupe toutes les lignes de cotes d’un chantier. Un **devis** est la restitution PDF de ce relevé chiffré.

---

## 12. Indicateurs de valeur pour investisseurs / gestionnaires

- **Gain de temps :** fin de la double saisie carnet → Excel/Word.
- **Professionnalisation :** devis uniformes avec logo et calculs automatiques.
- **Adaptation locale :** TVA Mali, FCFA, contexte chantier africain, offline-first.
- **Scalabilité SaaS :** modèle Freemium → Pro par entreprise.
- **Rétention :** catalogue et historique clients/chantiers capitalisés dans l’app.
- **Évolutivité :** base sync cloud prête pour multi-utilisateurs, rapports, extensions web.

---

## 13. État d’avancement (MVP)

Fonctionnalités déjà couvertes ou en cours dans le MVP :

- Flux complet relevé → client/chantier → devis PDF.
- Articles et fournisseurs intégrés au catalogue ouvrages.
- Remise et TVA par relevé.
- Rôles et restrictions Free/Pro.
- Distribution Android via **EAS Build** (APK de test).

Prochaines évolutions possibles : sync étendue, analytics, facturation complète, intégrations comptables, expansion régionale.

---

## 14. Vision

Faire de Losange **l’outil de référence** pour la prise de cotes et l’estimation rapide sur chantier en Afrique de l’Ouest — simple sur le terrain, crédible face au client, rentable pour la PME qui l’adopte.

---

## Annexe — Idées de slides pour le deck

1. Couverture — Losange, la prise de cotes BTP reinventée  
2. Le problème — carnets, ressaisie, devis artisanaux  
3. La solution — offline terrain + devis automatique  
4. Marché — BTP Afrique de l’Ouest / Mali  
5. Démo du parcours — 7 étapes  
6. UX terrain — une main, pavé numérique, soleil  
7. Fonctionnalités — catalogue, clients, export PDF  
8. Rôles & gouvernance — A, S, C, T  
9. Business model — Gratuit vs Pro  
10. Architecture — mobile offline + cloud  
11. Traction / MVP — où en est le produit  
12. Vision & appel — expansion et partenariats  
