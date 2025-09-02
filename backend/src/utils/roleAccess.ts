export const ALL_TYPES = ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'];

export function normalizeRole(role = ''): string {
  return role
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeType(type = ''): string | undefined {
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
        .toLowerCase() === norm,
  );
}

export const roleMap: Record<string, string[]> = {
  Administrateur: ALL_TYPES,
  'Regisseur General': ALL_TYPES,
  'Regisseur Son': ['Son', 'Vidéo', 'Autre'],
  'Regisseur Lumiere': ['Lumière', 'Vidéo', 'Autre'],
  'Regisseur Plateau': ['Plateau', 'Vidéo', 'Autre'],
  Autre: ALL_TYPES,
};

export function canModify(role: string, type?: string): boolean {
  const allowed = roleMap[normalizeRole(role)];
  if (!allowed) return false;
  if (!type) return true; // if type not specified, allow as long as role is known
  return allowed.includes(type);
}
