import { isMasterIdentifiant, loginMasterAdmin } from './masterLogin';
import { loginTerrainAdmin } from './terrainLogin';

export async function loginAdminWeb(identifiant, motDePasse) {
  if (isMasterIdentifiant(identifiant)) {
    return loginMasterAdmin(identifiant, motDePasse);
  }

  return loginTerrainAdmin(identifiant, motDePasse);
}
