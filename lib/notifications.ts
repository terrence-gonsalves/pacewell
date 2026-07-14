import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHECKIN_NOTIFICATION_ID_KEY =
    'pacewell_checkin_notification_id';

const INSIGHT_NOTIFICATION_ID_KEY =
    'pacewell_insight_notification_id';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationPermissionState =
    | 'granted'
    | 'denied'
    | 'undetermined';

// ─── Configure Notification Handler ──────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Android Channels ────────────────────────────────────────────────────────

export const setupAndroidChannel = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(
        'checkin-reminders',
        {
            name: 'Check-in Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2d6a4f',
        }
    );

    await Notifications.setNotificationChannelAsync(
        'insight-reminders',
        {
            name: 'Insight Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2d6a4f',
        }
    );

    await Notifications.setNotificationChannelAsync(
        'insight-generation',
        {
            name: 'Insight Generation',
            importance: Notifications.AndroidImportance.LOW,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2d6a4f',
        }
    );
};

// ─── Permission Management ───────────────────────────────────────────────────

export const getNotificationPermissionStatus =
    async (): Promise<NotificationPermissionState> => {
        try {
            const permissions =
                await Notifications.getPermissionsAsync();

            if (permissions.status === 'granted') {
                return 'granted';
            }

            if (permissions.status === 'denied') {
                return 'denied';
            }

            return 'undetermined';
        } catch (error) {
            console.error(
                'Error checking notification permissions:',
                error
            );

            return 'undetermined';
        }
    };

export const requestNotificationPermissions =
    async (): Promise<boolean> => {
        try {
            const currentStatus = await getNotificationPermissionStatus();

            if (currentStatus === 'granted') {
                return true;
            }

            const permissions = await Notifications.requestPermissionsAsync();

            return permissions.status === 'granted';
        } catch (error) {
            console.error(
                'Error requesting notification permissions:',
                error
            );

            return false;
        }
    };

// ─── Time Validation ─────────────────────────────────────────────────────────

const parseReminderTime = (
    time: string
): { hour: number; minute: number } | null => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

    if (!match) {
        console.error(
            `Invalid reminder time: "${time}". Expected HH:mm.`
        );

        return null;
    }

    return {
        hour: Number(match[1]),
        minute: Number(match[2]),
    };
};

// ─── Daily Check-in Reminder ─────────────────────────────────────────────────

export const scheduleDailyCheckInNotification = async (
    time: string
): Promise<boolean> => {
    try {
        const permissionStatus = await getNotificationPermissionStatus();

        if (permissionStatus !== 'granted') {
            return false;
        }

        const parsedTime = parseReminderTime(time);

        if (!parsedTime) {
            return false;
        }

        await cancelCheckInNotification();

        const notificationId =
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Time for your daily check-in 💚',
                    body: 'Take 60 seconds to log how you are feeling today.',
                    data: {
                        screen: 'checkin',
                        notificationType: 'checkin-reminder',
                    },
                    sound: true,
                },
                trigger: {
                    type: Notifications
                        .SchedulableTriggerInputTypes.DAILY,
                    hour: parsedTime.hour,
                    minute: parsedTime.minute,
                    channelId:
                        Platform.OS === 'android'
                            ? 'checkin-reminders'
                            : undefined,
                },
            });

        await AsyncStorage.setItem(
            CHECKIN_NOTIFICATION_ID_KEY,
            notificationId
        );

        return true;
    } catch (error) {
        console.error(
            'Error scheduling check-in notification:',
            error
        );

        return false;
    }
};

export const cancelCheckInNotification =
    async (): Promise<void> => {
        try {
            const notificationId = await AsyncStorage.getItem(
                CHECKIN_NOTIFICATION_ID_KEY
            );

            if (!notificationId) return;

            await Notifications.cancelScheduledNotificationAsync(
                notificationId
            );

            await AsyncStorage.removeItem(
                CHECKIN_NOTIFICATION_ID_KEY
            );
        } catch (error) {
            console.error(
                'Error cancelling check-in notification:',
                error
            );
        }
    };

// ─── Insight Reminder ────────────────────────────────────────────────────────

export const scheduleBedtimeInsightNotification = async (
    time: string
): Promise<boolean> => {
    try {
        const permissionStatus = await getNotificationPermissionStatus();

        if (permissionStatus !== 'granted') {
            return false;
        }

        const parsedTime = parseReminderTime(time);

        if (!parsedTime) {
            return false;
        }

        await cancelBedtimeInsightNotification();

        const notificationId =
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Your insights are ready ✨',
                    body: 'Open Pacewell to review your personalised insights.',
                    data: {
                        screen: 'insights',
                        notificationType: 'insight-reminder',
                    },
                    sound: true,
                },
                trigger: {
                    type: Notifications
                        .SchedulableTriggerInputTypes.DAILY,
                    hour: parsedTime.hour,
                    minute: parsedTime.minute,
                    channelId:
                        Platform.OS === 'android'
                            ? 'insight-reminders'
                            : undefined,
                },
            });

        await AsyncStorage.setItem(
            INSIGHT_NOTIFICATION_ID_KEY,
            notificationId
        );

        return true;
    } catch (error) {
        console.error(
            'Error scheduling insight reminder:',
            error
        );

        return false;
    }
};

export const cancelBedtimeInsightNotification =
    async (): Promise<void> => {
        try {
            const notificationId = await AsyncStorage.getItem(
                INSIGHT_NOTIFICATION_ID_KEY
            );

            if (!notificationId) return;

            await Notifications.cancelScheduledNotificationAsync(
                notificationId
            );

            await AsyncStorage.removeItem(
                INSIGHT_NOTIFICATION_ID_KEY
            );
        } catch (error) {
            console.error(
                'Error cancelling insight reminder:',
                error
            );
        }
    };

// ─── Global Cancellation ─────────────────────────────────────────────────────

export const cancelAllReminderNotifications =
    async (): Promise<void> => {
        await Promise.all([
            cancelCheckInNotification(),
            cancelBedtimeInsightNotification(),
        ]);
    };