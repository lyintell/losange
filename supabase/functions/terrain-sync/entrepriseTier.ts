export const filterTransactionalRowsForProPull = <T extends Record<string, unknown>>(
  rows: T[],
  proActivatedLe: string | null | undefined
) => {
  if (!proActivatedLe) return rows;
  const cutoff = Date.parse(String(proActivatedLe));
  if (Number.isNaN(cutoff)) return rows;
  return rows.filter((row) => {
    const ts = Date.parse(String(row.mis_a_jour_le ?? row.cree_le ?? ''));
    return !Number.isNaN(ts) && ts >= cutoff;
  });
};
