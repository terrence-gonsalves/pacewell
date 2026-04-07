import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_PERMISSION_KEY = 'pacewell_health_permission';

// ─── Android Health Connect ───────────────────────────────────────────────────

const requestHealthConnectPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const {
            getSdkStatus,
            initialize,
            requestPermission,
            SdkAvailabilityStatus,
        } = require('react-native-health-connect');

        const status = await getSdkStatus();

        if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
            console.log('Health Connect not available, status:', status);

            return false;
        }

        const initialized = await initialize();

        if (!initialized) {
            console.log('Health Connect failed to initialize');

            return false;
        }

        const granted = await requestPermission([
            { accessType: 'read', recordType: 'SleepSession' },
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'read', recordType: 'RestingHeartRate' },
            { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
            { accessType: 'read', recordType: 'ExerciseSession' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ]);

        const hasPermissions = granted && granted.length > 0;

        await AsyncStorage.setItem(
            HEALTH_PERMISSION_KEY,
            hasPermissions ? 'granted' : 'denied'
        );

        return hasPermissions;
    } catch (err) {
        console.error('Health Connect permission error:', err);

        // if requestPermission crashes fall back to opening settings
        try {
            const { openHealthConnectSettings } = require('react-native-health-connect');
            openHealthConnectSettings();

            // optimistically mark as granted — user will need to manually grant
            await AsyncStorage.setItem(HEALTH_PERMISSION_KEY, 'pending');
        } catch (settingsErr) {
            console.error('Could not open Health Connect settings:', settingsErr);
        }

        return false;
    }
};

// ─── iOS HealthKit ────────────────────────────────────────────────────────────

const requestHealthKitPermissions = async (): Promise<boolean> => {
    try {
        const HealthKit = require('@kingstinct/react-native-healthkit').default;

        const readPermissions = [
            'HKCategoryTypeIdentifierSleepAnalysis',
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierHeartRate',
            'HKQuantityTypeIdentifierRestingHeartRate',
            'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
            'HKWorkoutType',
        ];

        await HealthKit.requestAuthorization(readPermissions, []);
        await AsyncStorage.setItem(HEALTH_PERMISSION_KEY, 'granted');

        return true;
    } catch (err) {
        console.error('HealthKit permission error:', err);

        return false;
    }
};

// ─── Unified ──────────────────────────────────────────────────────────────────

export const requestHealthPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
        return requestHealthKitPermissions();
    } else {
        return requestHealthConnectPermissions();
    }
};

export const getHealthPermissionStatus = async (): Promise<string> => {
    const status = await AsyncStorage.getItem(HEALTH_PERMISSION_KEY);

    return status ?? 'not_determined';
};

export const hasHealthPermissions = async (): Promise<boolean> => {
    const status = await getHealthPermissionStatus();

    return status === 'granted';
};

export const checkAndRefreshPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return hasHealthPermissions();

    try {
        const {
            getGrantedPermissions,
            initialize,
        } = require('react-native-health-connect');

        await initialize();

        const granted = await getGrantedPermissions();
        const hasPermissions = granted && granted.length > 0;

        await AsyncStorage.setItem(
            HEALTH_PERMISSION_KEY,
            hasPermissions ? 'granted' : 'not_determined'
        );

        return hasPermissions;
    } catch (err) {
        console.error('Error checking permissions:', err);
        
        return false;
    }
};