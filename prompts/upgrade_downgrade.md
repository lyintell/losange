# Changement de tier Gratuit ↔ Pro

Plan validé pour `access_rules.md` §3.

## Décisions validées

1. **Gratuit → Pro** : push local d'abord ; pull transactionnel uniquement si `mis_a_jour_le >= pro_activated_le` (pas de resurrection d'anciennes tombstones).
2. **Pro → Gratuit** : conserver le profil **Admin (A)** ; supprimer les autres profils.
3. **Pro → Gratuit** : garder les **10 clients** et **10 chantiers** les plus récents (`mis_a_jour_le`) ; tombstone le reste en cascade.
4. **Pro → Gratuit** : **10 ouvrages max par métier** (plus récents) ; tombstone le reste.
5. **Pro → Gratuit** : purge **logo + photos** du bucket Supabase `terrain-files` (best-effort).

## Schéma

Colonnes sur `entreprises` :

- `pro_activated_le` — rempli quand `ind_pro` passe 0 → 1
- `pro_downgraded_le` — rempli quand `ind_pro` passe 1 → 0

Même colonnes en SQLite local (`localDb.js`).

## Point d'entrée master

Toggle `ind_pro` dans `AdminScreen` → `master-admin-crud` (table `entreprises`).

### Gratuit → Pro

- `pro_activated_le = now()`, `pro_downgraded_le = NULL`
- Ne pas modifier les données transactionnelles cloud existantes

### Pro → Gratuit

Routine `applyFreeTierDowngrade(entrepriseId)` :

1. `pro_downgraded_le = now()`, `logo = NULL`, `ind_tva = 0`
2. Profils : garder Admin (A), supprimer les autres
3. Clients : garder 10 plus récents actifs, tombstone cascade pour le reste
4. Chantiers : garder 10 plus récents actifs (global), tombstone cascade pour le reste
5. Ouvrages : 10/métier max, tombstone + ouvrage_unites pour le reste
6. Purge storage `entreprises/{id}/`

## Edge Functions

### `terrain-login`

- Compte gratuit : `entreprise`, `profil(s)`, `metiers`, `unites` uniquement
- Compte Pro : payload complet (inchangé)

### `terrain-sync`

- Compte gratuit : push `entreprises` uniquement ; pull account-only
- Compte Pro : push complet ; pull transactionnel filtré par `pro_activated_le`

## Mobile

| Fichier | Rôle |
|---------|------|
| `entrepriseTierLocal.js` | Miroir local du downgrade (tombstones + trim + purge images) |
| `terrainAuth.js` | Bootstrap login gratuit sans données transactionnelles cloud |
| `terrainSyncPro.js` | Upgrade → marquer `_synced = 0` sur données transactionnelles ; downgrade → appliquer miroir local |
| `terrainSync.js` / `localDb.js` | Colonnes `pro_activated_le`, `pro_downgraded_le` |

## UX master

Modal de confirmation avant sauvegarde si `ind_pro` change sur une entreprise.

## Scénarios de test

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 1 | Gratuit, 5 chantiers locaux, master → Pro, sync | 5 chantiers poussés ; pas de pull d'anciennes tombstones |
| 2 | Pro, 20 clients cloud, master → Gratuit | 10 clients actifs ; logo/TVA off |
| 3 | Pro → Gratuit → login mobile | UI gratuite ; données locales alignées |
| 4 | Gratuit → Pro → Gratuit rapide | Pas d'orphelins cloud |
| 5 | Pro avec photos | Downgrade purge storage + clés en base |
