const ALL_TYPES = ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'];

function normalizeRole(role = '') {
  return role
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeType(type = '') {
  const norm = type
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  return ALL_TYPES.find(
    (t) =>
      t
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase() === norm
  );
}

const roleMap = {
  Administrateur: ALL_TYPES,
  'Regisseur General': ALL_TYPES,
  'Regisseur Son': ['Son', 'Vidéo', 'Autre'],
  'Regisseur Lumiere': ['Lumière', 'Vidéo', 'Autre'],
  'Regisseur Plateau': ['Plateau', 'Vidéo', 'Autre'],
  Autre: ALL_TYPES,
};

function canModify(role, type) {
  const allowed = roleMap[normalizeRole(role)];
  if (!allowed) return false;
  if (!type) return true; // if type not specified, allow as long as role is known
  return allowed.includes(type);
}

module.exports = { roleMap, canModify, ALL_TYPES, normalizeRole, normalizeType };
