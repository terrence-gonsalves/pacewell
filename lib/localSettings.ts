import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_WEEKLY_GOAL = 5;
export const DEFAULT_CHECKIN_REMINDER_TIME = '17:00';
export const DEFAULT_INSIGHT_REMINDER_TIME = '20:00';

export const DEFAULT_NOTIFICATIONS_ENABLED = false;
export const DEFAULT_CHECKIN_REMINDER_ENABLED = false;
export const DEFAULT_INSIGHT_REMINDER_ENABLED = false;

export const localSettingsKey = (userId: string, key: string) =>
    `pacewell:${userId}:${key}`;

export const getUserSetting = async (
    userId: string,
    key: string
): Promise<string | null> => {
    return await AsyncStorage.getItem(localSettingsKey(userId, key));
};

export const setUserSetting = async (
    userId: string,
    key: string,
    value: string
): Promise<void> => {
    await AsyncStorage.setItem(localSettingsKey(userId, key), value);
};

export const removeUserLocalSettings = async (
    userId: string
): Promise<void> => {
    await AsyncStorage.multiRemove([
        localSettingsKey(userId, 'units'),
        localSettingsKey(userId, 'weekly_goal'),

        localSettingsKey(userId, 'notifications_enabled'),
        localSettingsKey(userId, 'checkin_reminder_enabled'),
        localSettingsKey(userId, 'checkin_reminder_time'),
        localSettingsKey(userId, 'insight_reminder_enabled'),
        localSettingsKey(userId, 'insight_reminder_time'),

        localSettingsKey(userId, 'sync_enabled'),
        localSettingsKey(userId, 'sync_interval'),
        localSettingsKey(userId, 'last_synced'),
        localSettingsKey(userId, 'last_insights_date'),
    ]);
};