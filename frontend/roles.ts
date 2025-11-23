export const ADMIN_ROLE = 'Administrateur';
export const REGISSEUR_GENERAL_ROLE = 'Regisseur General';
export const REGISSEUR_LUMIERE_ROLE = 'Regisseur Lumiere';
export const REGISSEUR_SON_ROLE = 'Regisseur Son';
export const REGISSEUR_PLATEAU_ROLE = 'Regisseur Plateau';
export const AUTRE_ROLE = 'Autre';

export const ROLES = [
  ADMIN_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  REGISSEUR_GENERAL_ROLE,
  AUTRE_ROLE,
];

export default ROLES;

/**
 * Normalize an incoming role value to a known translation key.
 * Returns `undefined` when no matching role is found.
 */
export const normalizeRoleTranslationKey = (role) => {
  if (!role) return undefined;
  const trimmedRole = role.trim();
  return ROLES.find((knownRole) =>
    knownRole.toLowerCase() === trimmedRole.toLowerCase(),
  );
};
