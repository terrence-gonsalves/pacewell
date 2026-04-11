import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIF_TIME_KEY = 'pacewell_notif_time';
const NOTIF_ID_KEY = 'pacewell_notif_id';
const NOTIF_PERMISSION_KEY = 'pacewell_notif_permission_asked';
const BEDTIME_NOTIF_ID_KEY = 'pacewell_bedtime_notif_id';

// ─── Configure Notification Handler ──────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
    }),
});

// ─── Create Android Channels ──────────────────────────────────────────────────

export const setupAndroidChannel = async (): Promise<void> => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('checkin-reminders', {
            name: 'Check-in Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2d6a4f',
        });

        await Notifications.setNotificationChannelAsync('insight-generation', {
            name: 'Insight Generation',
            importance: Notifications.AndroidImportance.LOW,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2d6a4f',
        });
    }
};

// ─── Request Permissions ──────────────────────────────────────────────────────

export const requestNotificationPermissions = async (): Promise<boolean> => {
    try {
        const alreadyAsked = await AsyncStorage.getItem(NOTIF_PERMISSION_KEY);
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        if (existingStatus === 'granted') return true;
        if (existingStatus === 'denied' && alreadyAsked) return false;

        const { status } = await Notifications.requestPermissionsAsync();

        await AsyncStorage.setItem(NOTIF_PERMISSION_KEY, 'true');

        return status === 'granted';
    } catch (err) {
        console.error('Error requesting notification permissions:', err);

        return false;
    }
};

// ─── Schedule Daily Check-in Notification ────────────────────────────────────

export const scheduleDailyCheckInNotification = async (
    time?: string
): Promise<void> => {
    try {
        const { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') return;

        const storedTime = time ?? await AsyncStorage.getItem(NOTIF_TIME_KEY) ?? '08:00';
        const [hours, minutes] = storedTime.split(':').map(Number);

        await cancelCheckInNotification();

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Time for your daily check-in 💚',
                body: 'Take 60 seconds to log how you\'re feeling today.',
                data: { screen: 'checkin' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
            },
        });

        await AsyncStorage.setItem(NOTIF_ID_KEY, notificationId);
    } catch (err) {
        console.error('Error scheduling check-in notification:', err);
    }
};

// ─── Cancel Check-in Notification ────────────────────────────────────────────

export const cancelCheckInNotification = async (): Promise<void> => {
    try {
        const notificationId = await AsyncStorage.getItem(NOTIF_ID_KEY);
        
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
            await AsyncStorage.removeItem(NOTIF_ID_KEY);
        }
    } catch (err) {
        console.error('Error cancelling check-in notification:', err);
    }
};

// ─── Schedule Bedtime Insight Notification ────────────────────────────────────

export const scheduleBedtimeInsightNotification = async (
    time?: string
): Promise<void> => {
    try {
        const { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') return;

        const bedtime = time ?? '22:00';
        const [hours, minutes] = bedtime.split(':').map(Number);

        await cancelBedtimeInsightNotification();

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Your evening insights are ready ✨',
                body: 'Pacewell has analysed your day. Tap to see your personalised insights.',
                data: { screen: 'insights', action: 'generate' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
                channelId: Platform.OS === 'android' ? 'insight-generation' : undefined,
            },
        });

        await AsyncStorage.setItem(BEDTIME_NOTIF_ID_KEY, notificationId);
    } catch (err) {
        console.error('Error scheduling bedtime insight notification:', err);
    }
};

// ─── Cancel Bedtime Insight Notification ─────────────────────────────────────

export const cancelBedtimeInsightNotification = async (): Promise<void> => {
    try {
        const notificationId = await AsyncStorage.getItem(BEDTIME_NOTIF_ID_KEY);

        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
            await AsyncStorage.removeItem(BEDTIME_NOTIF_ID_KEY);
        }
    } catch (err) {
        console.error('Error cancelling bedtime insight notification:', err);
    }
};

// ─── Get Notification Status ──────────────────────────────────────────────────

export const getNotificationStatus = async (): Promise<{
    permitted: boolean;
    scheduledTime: string | null;
}> => {
    const { status } = await Notifications.getPermissionsAsync();
    const scheduledTime = await AsyncStorage.getItem(NOTIF_TIME_KEY);
    
    return {
        permitted: status === 'granted',
        scheduledTime,
    };
};