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
        const status = await HealthConnect.getSdkStatus();

        if (status !== HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
            console.log('Health Connect not available');

            return false;
        }

        await HealthConnect.initialize();
        await AsyncStorage.setItem(HEALTH_PERMISSION_KEY, 'granted');

        return true;
    } catch (err) {
        console.error('Health Connect init error:', err);

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