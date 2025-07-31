const ALL_TYPES = ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'];

const roleMap = {
  'Administrateur': ALL_TYPES,
  'Regisseur(se) Général': ALL_TYPES,
  'Régisseur(se) Son': ['Son', 'Vidéo', 'Autre'],
  'Régisseur(se) Lumière': ['Lumière', 'Vidéo', 'Autre'],
  'Régisseur(se) Plateau': ['Plateau', 'Vidéo', 'Autre'],
  'Autre': ALL_TYPES,
};

function canModify(role, type) {
  const allowed = roleMap[role];
  if (!allowed) return false;
  if (!type) return true; // if type not specified, allow as long as role is known
  return allowed.includes(type);
}

module.exports = { roleMap, canModify, ALL_TYPES };
