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
  Administrateur: ALL_TYPES,
  'Regisseur General': ALL_TYPES,
  'Regisseur Son': ['Son', 'Vidéo', 'Autre'],
  'Regisseur Lumiere': ['Lumière', 'Vidéo', 'Autre'],
  'Regisseur Plateau': ['Plateau', 'Vidéo', 'Autre'],
  Autre: ALL_TYPES,
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
