import type { User, UserPreferences } from '../models/User';
import { mergePreferences } from '../models/User';

export type NotificationPreference = keyof UserPreferences['emailNotifications'];

function resolvePreferences(user?: Pick<User, 'preferences'> | null): UserPreferences {
  return mergePreferences(undefined, user?.preferences);
}

export function isNotificationEnabled(
  user: Pick<User, 'preferences'> | null | undefined,
  preference: NotificationPreference,
): boolean {
  const preferences = resolvePreferences(user);
  return Boolean(preferences.emailNotifications[preference]);
}
