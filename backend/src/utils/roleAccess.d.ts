export const ALL_TYPES: string[];
export function normalizeRole(role?: string): string;
export function normalizeType(type?: string): string | undefined;
export const roleMap: Record<string, string[]>;
export function canModify(role: string, type?: string): boolean;
