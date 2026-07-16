import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getHealthSummary } from './health';
import { hasHealthPermissions } from './healthPermissions';
import { getLocalDate } from './locale';
import { supabase } from './supabase';
import { generateInsights, hasGeneratedInsightsToday } from './insights';
import {
    getUserSetting,
    setUserSetting,
} from './localSettings';

// ─── Constants ────────────────────────────────────────────────────────────────

export const BACKGROUND_SYNC_TASK = 'pacewell-health-sync';

const DEFAULT_SYNC_INTERVAL_HOURS = 4;
const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    return user?.id ?? null;
};

export const SYNC_INTERVALS = [
    { label: '1 hour', value: 1 },
    { label: '2 hours', value: 2 },
    { label: '3 hours', value: 3 },
    { label: '4 hours', value: 4 },
    { label: '6 hours', value: 6 },
    { label: '8 hours', value: 8 },
    { label: '12 hours', value: 12 },
];

const getValidSyncInterval = (
    storedValue: string | null
): number => {
    if (!storedValue) {
        return DEFAULT_SYNC_INTERVAL_HOURS;
    }

    const parsedValue = Number(storedValue);

    const isValid = SYNC_INTERVALS.some(
        interval => interval.value === parsedValue
    );

    return isValid
        ? parsedValue
        : DEFAULT_SYNC_INTERVAL_HOURS;
};

// ─── Sync Settings ────────────────────────────────────────────────────────────

export interface SyncSettings {
    enabled: boolean;
    intervalHours: number;
    lastSynced: string | null;
}

export const getSyncSettings = async (): Promise<SyncSettings> => {
    const userId = await getCurrentUserId();

    if (!userId) {
        return {
            enabled: false,
            intervalHours: DEFAULT_SYNC_INTERVAL_HOURS,
            lastSynced: null,
        };
    }

    const [enabled, interval, lastSynced] =
    await Promise.all([
        getUserSetting(userId, 'sync_enabled'),
        getUserSetting(userId, 'sync_interval'),
        getUserSetting(userId, 'last_synced'),
    ]);

    return {
        enabled: enabled === 'true',
        intervalHours: getValidSyncInterval(interval),
        lastSynced: lastSynced ?? null,
    };
};

// ─── Save Sync Function ───────────────────────────────────────────────────────

export const saveSyncSettings = async (settings: Partial<SyncSettings>): Promise<void> => {
    const userId = await getCurrentUserId();

    if (!userId) return;

    if (settings.enabled !== undefined) {
        await setUserSetting(userId, 'sync_enabled', String(settings.enabled));
    }

    if (settings.intervalHours !== undefined) {
        await setUserSetting(userId, 'sync_interval', String(settings.intervalHours));
    }
};

// ─── Core Sync Function ───────────────────────────────────────────────────────

export const performHealthSync = async (): Promise<{
    success: boolean;
    message: string;
    data?: any;
}> => {
    try {
        const hasPermissions = await hasHealthPermissions();

        if (!hasPermissions) {
            return { success: false, message: 'Health permissions not granted' };
        }

        const summary = await getHealthSummary();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, message: 'No active session' };
        }

        const today = getLocalDate();

        await supabase.from('health_metrics').upsert({
            user_id: user.id,
            date: today,
            avg_heart_rate: summary.heartRate?.average ?? null,
            min_heart_rate: summary.heartRate?.min ?? null,
            max_heart_rate: summary.heartRate?.max ?? null,
            resting_heart_rate: summary.heartRate?.resting ?? null,
            hrv: summary.heartRate?.hrv ?? null,
            step_count: summary.steps?.count ?? null,
            weight_kg: summary.weight ?? null,
            source: 'wearable',
        }, {
            onConflict: 'user_id, date',
        });

        const now = new Date().toISOString();

        await setUserSetting(user.id, 'last_synced', now);

        // generate insights after first sync of the day — silently in background
        const alreadyGenerated = await hasGeneratedInsightsToday();

        if (!alreadyGenerated) {
            generateInsights().catch(err =>
                console.log('Background insight generation after sync:', err)
            );
        }

        return {
            success: true,
            message: 'Sync complete',
            data: summary,
        };
    } catch (err) {
        console.error('Health sync error:', err);

        return {
            success: false,
            message: err instanceof Error ? err.message : 'Unknown error',
        };
    }
};

// ─── Background Task Definition ───────────────────────────────────────────────

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
        const settings = await getSyncSettings();

        if (!settings.enabled) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const result = await performHealthSync();

        return result.success
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.Failed;
    } catch (err) {
        console.error('Background sync task error:', err);

        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// ─── Schedule Management ──────────────────────────────────────────────────────

export const scheduleBackgroundSync = async (
    intervalHours: number
): Promise<void> => {
    try {
        const validInterval = SYNC_INTERVALS.some(interval => interval.value === intervalHours)
            ? intervalHours
            : DEFAULT_SYNC_INTERVAL_HOURS;

        const intervalSeconds = validInterval * 60 * 60;

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: intervalSeconds,
            stopOnTerminate: false,
            startOnBoot: true,
        });
    } catch (err) {
        console.error('Error scheduling background sync:', err);
    }
};

export const cancelBackgroundSync = async (): Promise<void> => {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);

            console.log('Background sync cancelled');
        }
    } catch (err) {
        console.error('Error cancelling background sync:', err);
    }
};

export const getLastSyncedFormatted = async (): Promise<string> => {
    const userId = await getCurrentUserId();

    if (!userId) return 'Never';

    const lastSynced = await getUserSetting(userId, 'last_synced');

    if (!lastSynced) return 'Never';

    const date = new Date(lastSynced);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
};