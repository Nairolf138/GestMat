import {
  ADMIN_ROLE,
  REGISSEUR_GENERAL_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  AUTRE_ROLE,
} from '../../roles';

export const confirmDialog = (message) => window.confirm(message);

export const toLoanItemsPayload = (items = []) =>
  items
    .filter((item) => item?.equipment?._id)
    .map((item) => ({
      equipment: item.equipment._id,
      quantity: item.quantity,
    }));

export const ALL_TYPES = ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'];

const roleMap = {
  [ADMIN_ROLE]: ALL_TYPES,
  [REGISSEUR_GENERAL_ROLE]: ALL_TYPES,
  [REGISSEUR_SON_ROLE]: ['Son', 'Vidéo', 'Autre'],
  [REGISSEUR_LUMIERE_ROLE]: ['Lumière', 'Vidéo', 'Autre'],
  [REGISSEUR_PLATEAU_ROLE]: ['Plateau', 'Vidéo', 'Autre'],
  [AUTRE_ROLE]: ALL_TYPES,
};

const normalizeRole = (role = '') =>
  role
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const canManageEquipment = (role, type) => {
  const allowed = roleMap[normalizeRole(role)];
  if (!allowed) return false;
  if (!type) return true;
  return allowed.includes(type);
};
