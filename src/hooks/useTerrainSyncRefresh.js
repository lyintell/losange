import { useCallback, useEffect, useRef, useState } from 'react';
import { getLoggedInProfilViewLocal, isLoggedInAdminLocal } from '../db/querries';
import { buildSyncSuccessMessage, showSyncAlert } from '../utils/terrainSyncUi';

/** Pull-to-refresh ou bouton sync : même flux que PlusScreen. */
export function useTerrainSyncRefresh({ onSyncFromSupabase, onReload }) {
  const [syncing, setSyncing] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const [profil, isAdmin] = await Promise.all([
          getLoggedInProfilViewLocal(),
          isLoggedInAdminLocal(),
        ]);
        if (!cancelled) {
          setCanSync(Boolean(profil?.is_pro) || isAdmin);
        }
      } catch (error) {
        console.error('Erreur chargement acces sync:', error);
        if (!cancelled) {
          setCanSync(false);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSync = useCallback(
    async ({ showAlert = true } = {}) => {
      if (syncingRef.current) return;

      syncingRef.current = true;
      setSyncing(true);

      let alertPayload = null;

      try {
        if (canSync && onSyncFromSupabase) {
          const result = await onSyncFromSupabase();
          if (result?.forcedLogout) {
            return result;
          }

          if (showAlert) {
            if (result?.ok) {
              alertPayload = ['Synchronisation', buildSyncSuccessMessage(result)];
            } else if (result?.error) {
              alertPayload = ['Erreur', result.error];
            }
          }
        }

        if (onReload) {
          await onReload();
        }
      } catch (error) {
        if (showAlert) {
          alertPayload = ['Erreur', error.message || 'Synchronisation impossible.'];
        } else {
          throw error;
        }
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }

      if (alertPayload) {
        await showSyncAlert(alertPayload[0], alertPayload[1]);
      }

      return { ok: true };
    },
    [canSync, onReload, onSyncFromSupabase]
  );

  const handleRefresh = useCallback(() => runSync({ showAlert: true }), [runSync]);

  return {
    syncing,
    canSync,
    runSync,
    handleRefresh,
  };
}
