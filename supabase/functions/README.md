# Edge Functions — Auth MASTER (admin web)

## 1. Secrets obligatoires (Dashboard → Edge Functions → Secrets)

| Nom | Exemple |
|-----|---------|
| `MASTER_ADMIN_IDENTIFIANT` | `Y62L` |
| `MASTER_ADMIN_PASSWORD` | `2620-LosangE#` |
| `MASTER_SESSION_SECRET` | chaîne aléatoire 32+ caractères |

Sans ces 3 secrets → erreur « Secrets MASTER non configures sur Supabase. »

## 2. Deployer les fonctions

### Via CLI (recommandé)

```bash
supabase login
supabase link --project-ref cbjkuecorfuxythadckj
supabase secrets set MASTER_ADMIN_IDENTIFIANT=Y62L
supabase secrets set MASTER_ADMIN_PASSWORD="2620-LosangE#"
supabase secrets set MASTER_SESSION_SECRET="votre-cle-aleatoire-longue"
supabase functions deploy master-admin-login
supabase functions deploy master-admin-verify
```

### Via Dashboard

1. **Edge Functions** → créer `master-admin-login` et `master-admin-verify`
2. Coller le code (1 fichier : `masterSession.ts` + `index.ts` fusionnés, sans import)
3. **Désactiver « Verify JWT »** sur chaque fonction (sinon 401 avant exécution)
4. Deploy

## 3. Tester dans le Dashboard

Fonction `master-admin-login`, body :

```json
{ "identifiant": "Y62L", "motDePasse": "2620-LosangE#" }
```

Réponse attendue : `{ "ok": true, "token": "..." }`

## 4. Erreur « non-2xx status code »

Causes fréquentes :

1. **Verify JWT activé** → désactiver sur la fonction
2. **Secrets manquants** → ajouter les 3 secrets puis redéployer
3. **Mauvais identifiant/mot de passe**
4. **Code incomplet** (import `masterSession` non résolu) → redéployer via CLI ou fusionner les fichiers

Après modification du code serveur, **redéployer** les deux fonctions.

---

## Edge Function — Auth terrain (mobile)

Connexion mobile via identifiant/mot de passe stockés dans la table `profils` Supabase.
Rejet si l'entreprise liee a `ind_active !== 1` (« Compte inactif »).
Comptes Pro : si `date_actif_jusqua` est depassee, `ind_active` passe a 0 automatiquement (login + sync).
Premier login terrain : `date_premier_login` est renseigne sur le profil.

### 1. Schema Supabase

Executer les migrations `identifiant` / `mot_de_passe` sur `profils` (voir `supabase/schema.sql`).

Creer un profil terrain dans l'admin web avec :
- **identifiant** : format `A00A` (1 lettre + 2 chiffres + 1 lettre)
- **mot_de_passe** : mot de passe en clair (auth via Edge Function service role)
- **entreprise_id** : entreprise avec `ind_active = 1`

### 2. Deployer la fonction

```bash
supabase functions deploy terrain-login
```

Chaque fonction terrain est un seul fichier `index.ts` (pas d'import `_shared/`, sinon echec au bundle Dashboard).

**Désactiver « Verify JWT »** sur `terrain-login` (deja dans `supabase/config.toml`).

Aucun secret supplementaire requis : la fonction utilise `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (fournis automatiquement).

### 3. Tester dans le Dashboard

Fonction `terrain-login`, body :

```json
{ "identifiant": "A00A", "motDePasse": "votre-mot-de-passe" }
```

Reponses attendues :
- `{ "ok": true, "payload": { ... } }` — entreprise active
- `{ "ok": false, "error": "Compte inactif." }` — entreprise desactivee
- `{ "ok": false, "error": "Identifiant ou mot de passe incorrect." }` — credentials invalides

---

## Edge Function — Sync terrain Pro (mobile)

Push des enregistrements `_synced = 0` (ouvrages, ouvrage_unites, clients, chantiers, releves, ligne_releves) puis pull catalogue + donnees entreprise. Reserve aux comptes `entreprises.ind_pro = 1`.

```bash
supabase db push
supabase functions deploy terrain-sync
```

Body exemple :

```json
{
  "identifiant": "A00A",
  "motDePasse": "votre-mot-de-passe",
  "push": {
    "ouvrages": [],
    "ouvrage_unites": [],
    "clients": [],
    "chantiers": [],
    "releves": [],
    "ligne_releves": []
  }
}
```

Reponse : `{ "ok": true, "pushedCounts": { ... }, "pull": { ... } }`
