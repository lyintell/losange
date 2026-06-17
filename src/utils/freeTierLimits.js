export const FREE_TIER_LIMITS = {
  maxChantiers: 10,
  maxClients: 10,
  maxMetiersSelection: 3,
  maxOuvragesPerMetier: 10,
  maxUsers: 1,
};

export const isProAccount = (entity) =>
  Number(entity?.ind_pro ?? entity?.is_pro) === 1;

export const freeTierError = (message) => message;
