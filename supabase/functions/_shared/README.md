# Code partagé (référence locale)

Le bundler Supabase **n'inclut pas** `../_shared/` au déploiement (Dashboard ou CLI par fonction).

Copier les changements tier dans chaque dossier de fonction :

| Source de vérité | Fichiers déployés |
|------------------|-------------------|
| `master-admin-crud/entrepriseTier.ts` (complet) | idem |
| `filterTransactionalRowsForProPull` | `terrain-login/entrepriseTier.ts`, `terrain-sync/entrepriseTier.ts` |

Après modification ici, resynchroniser les copies dans les dossiers ci-dessus.
