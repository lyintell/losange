# Problème de défilement dans l'écran admin
_Exported on 5/28/2026 at 23:06:03 GMT from Cursor (3.5.38)_

---

**User**

Dans l ecran admin, je ne peux pas scroller. Permettre de scroller les pages

---

**Cursor**

Je vais examiner l'écran admin et la structure de navigation pour identifier ce qui bloque le défilement.


Le défilement est bloqué par une mise en page flex sans `minHeight: 0` et par l’absence de `ScrollView` sur la barre latérale et le panneau de détails. Je corrige la structure pour permettre le scroll sur toutes les zones.


Le défilement est corrigé sur l’écran admin. Voici ce qui bloquait et ce qui a été changé.

**Cause** : sur le web, les conteneurs en `flex: 1` sans `minHeight: 0` ne laissent pas les zones internes défiler. La sidebar et le panneau détails n’avaient pas de `ScrollView`, et la liste n’occupait pas correctement l’espace disponible.

**Modifications** :

1. **Sidebar** — liste des tables dans un `ScrollView` ; le bouton Logout reste fixe en bas.
2. **Liste centrale** — `FlatList` avec `flex: 1` et `minHeight: 0` pour défiler les enregistrements.
3. **Panneau Détails** — tout le contenu (lecture et formulaire) dans un `ScrollView` ; suppression de la hauteur max fixe (520 px) du formulaire.
4. **Layout** — `minHeight: 0` sur les conteneurs flex (`container`, `main`, panneaux) et sur `screenContainer` dans `App.js`.

Tu peux recharger la page web : la sidebar, la liste et les détails/formulaires doivent tous défiler indépendamment.

---

**User**

@prompts.txt (163-168) 

---

**Cursor**

Je vais explorer la structure actuelle (SQLite, localStorage, données en dur) pour brancher Supabase et retirer les autres sources de données.


Je crée la couche Supabase et je refactorise l’admin et le mobile pour retirer localStorage et les données en dur.


Configuration Supabase en place. Voici ce qui a changé :

## Admin web → Supabase direct

L’écran admin lit et écrit désormais dans Supabase (plus de `localStorage`) :
- Chargement de toutes les tables au démarrage
- CRUD (insert / update / delete) via `@supabase/supabase-js`
- États de chargement, sauvegarde et messages d’erreur

## Fichiers ajoutés

| Fichier | Rôle |
|---------|------|
| `src/db/supabaseClient.js` | Client Supabase |
| `src/db/supabaseAdmin.js` | Opérations CRUD admin |
| `supabase/schema.sql` | Schéma PostgreSQL à déployer sur Supabase |
| `.env.example` | Modèle de configuration |

## Données hardcodées supprimées

- `localStorage` dans `AdminScreen`
- `DEFAULT_ENTREPRISE_ID` / `entreprise_losange_local`
- Liste `METIERS` en dur → chargée depuis SQLite (`getMetiersLocal`)
- `entreprise_demo` dans le sélecteur métier

## Mobile (inchangé pour l’instant)

SQLite reste la base locale. Le mécanisme de sync bidirectionnel viendra ensuite. L’`entrepriseId` est résolu depuis la première entreprise en base locale.

---

## Mise en route

**1.** Copier la config :
```bash
cp .env.example .env
```

**2.** Renseigner dans `.env` :
```
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
```

**3.** Exécuter `supabase/schema.sql` dans l’éditeur SQL Supabase (crée les 10 tables + politiques RLS de dev).

**4.** Redémarrer Expo :
```bash
npm start
```

L’admin web se connectera alors directement à Supabase. Sur mobile, les métiers et l’entreprise viendront de SQLite une fois la sync implémentée.

---

**User**

<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: success
task_id: 782494
title: Install Supabase JavaScript client
output_path: C:\Users\oumar\.cursor\projects\c-Users-oumar-Documents-PROJECTS-MY-APPS-DEV-losange-NEW\terminals\782494.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

`@supabase/supabase-js` (^2.105.4) est installé et enregistré dans `package.json`.

Pour tester l’admin web, copie `.env.example` vers `.env`, renseigne tes clés Supabase, exécute `supabase/schema.sql` dans ton projet Supabase, puis redémarre Expo.

