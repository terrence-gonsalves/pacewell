import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_PERMISSION_KEY = 'pacewell_health_permission';

// ─── iOS HealthKit Permissions ────────────────────────────────────────────────

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

// ─── Android Health Connect Permissions ──────────────────────────────────────

const requestHealthConnectPermissions = async (): Promise<boolean> => {
    try {
        const HealthConnect = require('react-native-health-connect');
        const {
            initialize,
            requestPermission,
            getSdkStatus,
            SdkAvailabilityStatus,
        } = HealthConnect;

        // check if Health Connect is available
        const status = await getSdkStatus();

        if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
            console.log('Health Connect SDK not available:', status);

            return false;
        }

        // must initialize before requesting permissions
        const initialized = await initialize();
        
        if (!initialized) {
            console.log('Health Connect failed to initialize');

            return false;
        }

        // small delay to ensure native module is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));

        const permissions = [
            { accessType: 'read', recordType: 'SleepSession' },
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'read', recordType: 'RestingHeartRate' },
            { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
            { accessType: 'read', recordType: 'ExerciseSession' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ];

        const granted = await requestPermission(permissions);
        const allGranted = granted && granted.length > 0;

        await AsyncStorage.setItem(
            HEALTH_PERMISSION_KEY,
            allGranted ? 'granted' : 'denied'
        );

        return allGranted;

    } catch (err) {
        console.error('Health Connect permission error:', err);
        
        return false;
    }
};

// ─── Unified Permission Request ───────────────────────────────────────────────

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