import {
  ADMIN_ROLE,
  REGISSEUR_GENERAL_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  REGISSEUR_SON_ROLE,
  AUTRE_ROLE,
} from '../config/roles';

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
  [ADMIN_ROLE]: ALL_TYPES,
  [REGISSEUR_GENERAL_ROLE]: ALL_TYPES,
  [REGISSEUR_SON_ROLE]: ['Son', 'Vidéo', 'Autre'],
  [REGISSEUR_LUMIERE_ROLE]: ['Lumière', 'Vidéo', 'Autre'],
  [REGISSEUR_PLATEAU_ROLE]: ['Plateau', 'Vidéo', 'Autre'],
  [AUTRE_ROLE]: ALL_TYPES,
};

export function canModify(role: string, type?: string): boolean {
  const allowed = roleMap[normalizeRole(role)];
  if (!allowed) return false;
  if (!type) return true; // if type not specified, allow as long as role is known
  return allowed.includes(type);
}
