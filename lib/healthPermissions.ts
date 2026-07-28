import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_PERMISSION_KEY = 'pacewell_health_permission';

// ─── Android Health Connect ───────────────────────────────────────────────────

export const openHealthConnectForPermissions = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;

    try {
        const { getSdkStatus, initialize, openHealthConnectSettings } = require('react-native-health-connect');        
        const status = await getSdkStatus();

        if (status !== 3) return;

        await initialize();
        openHealthConnectSettings();
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Health Connect settings error:', message);
    }
};

export const checkHealthConnectPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const { getSdkStatus, initialize, getGrantedPermissions } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return false;

        await initialize();

        const granted = await getGrantedPermissions();
        const hasPermissions = granted && granted.length > 0;

        await AsyncStorage.setItem(
            HEALTH_PERMISSION_KEY,
            hasPermissions ? 'granted' : 'not_determined'
        );

        return hasPermissions;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Health Connect check error:', message);

        return false;
    }
};

export const requestHealthConnectPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const { getSdkStatus, initialize, requestPermission } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return false;
        
        await initialize();

        const granted = await requestPermission([
            { accessType: 'read', recordType: 'SleepSession' },
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'read', recordType: 'RestingHeartRate' },
            { accessType: 'read', recordType: 'ExerciseSession' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'read', recordType: 'Weight' },
        ]);

        const hasPermissions = granted && granted.length > 0;

        await AsyncStorage.setItem(
            HEALTH_PERMISSION_KEY,
            hasPermissions ? 'granted' : 'denied'
        );

        return hasPermissions;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Health Connect permission error:', message);

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
            'HKQuantityTypeIdentifierBodyMass',
        ];

        await HealthKit.requestAuthorization(readPermissions, []);
        await AsyncStorage.setItem(HEALTH_PERMISSION_KEY, 'granted');

        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('HealthKit permission error:', message);

        return false;
    }
};

// ─── Unified ──────────────────────────────────────────────────────────────────

export const requestHealthPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
        return requestHealthKitPermissions();
    }

    await openHealthConnectForPermissions();

    return false;
};

export const getHealthPermissionStatus = async (): Promise<string> => {
    const status = await AsyncStorage.getItem(HEALTH_PERMISSION_KEY);

    return status ?? 'not_determined';
};

export const hasHealthPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        return checkHealthConnectPermissions();
    }

    const status = await getHealthPermissionStatus();

    return status === 'granted';
};