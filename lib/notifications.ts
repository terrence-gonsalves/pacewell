import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIF_TIME_KEY = 'pacewell_notif_time';
const NOTIF_ID_KEY = 'pacewell_notif_id';
const NOTIF_PERMISSION_KEY = 'pacewell_notif_permission_asked';

// ─── Configure Notification Handler ──────────────────────────────────────────

// determine how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
    }),
});

// ─── Create Android Channel ───────────────────────────────────────────────────

export const setupAndroidChannel = async (): Promise<void> => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('checkin-reminders', {
            name: 'Check-in Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2d6a4f',
        });
    }
};

// ─── Request Permissions ──────────────────────────────────────────────────────

export const requestNotificationPermissions = async (): Promise<boolean> => {
    try {

        // check if we've already asked before
        const alreadyAsked = await AsyncStorage.getItem(NOTIF_PERMISSION_KEY);

        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        // if already granted just return true
        if (existingStatus === 'granted') return true;

        // if already denied and we've asked before don't ask again
        if (existingStatus === 'denied' && alreadyAsked) return false;

        // request permissions
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

        // get stored time or use default
        const storedTime = time ?? await AsyncStorage.getItem(NOTIF_TIME_KEY) ?? '08:00';
        const [hours, minutes] = storedTime.split(':').map(Number);

        // cancel any existing scheduled notification
        await cancelCheckInNotification();

        // schedule new daily notification
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

        // store the notification ID so we can cancel it later
        await AsyncStorage.setItem(NOTIF_ID_KEY, notificationId);
    } catch (err) {
        console.error('Error scheduling notification:', err);
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
        console.error('Error cancelling notification:', err);
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