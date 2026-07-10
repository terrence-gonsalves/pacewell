import AsyncStorage  from '@react-native-async-storage/async-storage';
import { cancelBedtimeInsightNotification, cancelCheckInNotification } from './notifications';
import { cancelBackgroundSync } from './syncManager';

const LEGACY_LOCAL_KEYS = [
    'pacewell_units',
    'pacewell_notif_time',
    'pacewell_weekly_goal',
    'pacewell_sync_enabled',
    'pacewell_sync_interval',
    'pacewell_sync_start_time',
    'pacewell_last_synced',
    'pacewell_last_insights_date',
    'pacewell_bedtime',
    'pacewell_insights_generating',
];

export const clearLocalAccountData = async (): Promise<void> => {
    await Promise.allSettled([
        cancelCheckInNotification(),
        cancelBedtimeInsightNotification(),
        cancelBackgroundSync(),
        AsyncStorage .multiRemove(LEGACY_LOCAL_KEYS),
    ]);
};

