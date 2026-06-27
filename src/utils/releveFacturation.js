export const TVA_TAUX_DEFAULT = 18;

export function computeReleveFacturation({
  lignesMontantTotal = 0,
  remise = 0,
  indTva = 0,
  tvaTaux = TVA_TAUX_DEFAULT,
}) {
  const brutHt = Number(lignesMontantTotal) || 0;
  const montantRemise = Math.min(Math.max(Number(remise) || 0, 0), brutHt);
  const totalHt = Math.max(0, brutHt - montantRemise);
  const applyTva = Number(indTva) === 1;
  const taux = Number(tvaTaux) || TVA_TAUX_DEFAULT;
  const montantTva = applyTva ? totalHt * (taux / 100) : 0;
  const totalTtc = totalHt + montantTva;

  return {
    brutHt,
    montantRemise,
    totalHt,
    montantTva,
    totalTtc,
    applyTva,
  };
}
