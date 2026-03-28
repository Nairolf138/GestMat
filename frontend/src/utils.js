import {
  ADMIN_ROLE,
  REGISSEUR_GENERAL_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  AUTRE_ROLE,
} from '../roles';

export const confirmDialog = (message) => window.confirm(message);

export const toLoanItemsPayload = (items = []) =>
  items
    .map((item) => {
      const kind = item?.kind === 'vehicle' ? 'vehicle' : 'equipment';
      if (kind === 'vehicle' && item?.vehicle?._id) {
        return {
          kind,
          vehicle: item.vehicle._id,
          quantity: 1,
        };
      }
      if (item?.equipment?._id) {
        return {
          kind,
          equipment: item.equipment._id,
          quantity: item.quantity,
        };
      }
      return null;
    })
    .filter(Boolean);

export const formatLoanItemLabel = (item) => {
  const kind = item?.kind === 'vehicle' ? 'vehicle' : 'equipment';
  if (kind === 'vehicle') {
    const vehicleName = item?.vehicle?.name;
    if (!vehicleName) return '';
    const registrationNumber =
      item?.vehicle?.registrationNumber || item?.vehicle?.immatriculation;
    const registrationSuffix = registrationNumber ? ` (${registrationNumber})` : '';
    return `${vehicleName}${registrationSuffix} x1`;
  }
  const name = item?.equipment?.name;
  if (!name) return '';
  const quantity = item?.quantity;
  return `${name}${quantity ? ` x${quantity}` : ''}`;
};

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

export const downloadBlob = (blob, filename, fallbackName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || fallbackName || 'export';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
