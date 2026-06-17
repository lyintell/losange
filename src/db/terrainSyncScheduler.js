import { isProEntrepriseLocal, runTerrainSyncPushOnly } from './terrainSyncPro';

let debounceTimer = null;

export const scheduleTerrainSyncAfterWrite = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    try {
      const isPro = await isProEntrepriseLocal();
      if (!isPro) return;
      await runTerrainSyncPushOnly();
    } catch (error) {
      console.warn('Sync automatique apres ecriture:', error);
    }
  }, 2500);
};
