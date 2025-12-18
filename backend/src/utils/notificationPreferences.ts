import type { User, UserPreferences } from '../models/User';
import { mergePreferences } from '../models/User';

export type NotificationPreference = keyof UserPreferences['emailNotifications'];

export interface NotificationStatus {
  enabled: boolean;
  source: 'default' | 'user';
  value: boolean;
}

export function resolvePreferences(user?: Pick<User, 'preferences'> | null): UserPreferences {
  return mergePreferences(undefined, user?.preferences);
}

export function getNotificationStatus(
  user: Pick<User, 'preferences'> | null | undefined,
  preference: NotificationPreference,
): NotificationStatus {
  const preferences = resolvePreferences(user);
  const rawPreference = user?.preferences?.emailNotifications?.[preference];
  const value = Boolean(preferences.emailNotifications[preference]);

  return {
    enabled: value,
    source: rawPreference === undefined ? 'default' : 'user',
    value,
  };
}

export function isNotificationEnabled(
  user: Pick<User, 'preferences'> | null | undefined,
  preference: NotificationPreference,
): boolean {
  return getNotificationStatus(user, preference).enabled;
}
