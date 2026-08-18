import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_PERMISSION_KEY = 'pacewell_health_permission';

type HealthConnectPermission = {
    accessType: 'read';
    recordType:
        | 'SleepSession'
        | 'Steps'
        | 'HeartRate'
        | 'RestingHeartRate'
        | 'ExerciseSession'
        | 'Weight';
};

export type HealthConnectPermissionStatus = {
    available: boolean;
    allGranted: boolean;
    grantedPermissions: HealthConnectPermission[];
    missingPermissions: HealthConnectPermission[];
};

export const REQUIRED_HEALTH_CONNECT_PERMISSIONS: HealthConnectPermission[] = [
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'RestingHeartRate' },
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Weight' },
];

export const HEALTH_CONNECT_PERMISSION_LABELS: Record<
    HealthConnectPermission['recordType'],
    string
> = {
    SleepSession: 'Sleep',
    Steps: 'Steps',
    HeartRate: 'Heart rate',
    RestingHeartRate: 'Resting heart rate',
    ExerciseSession: 'Exercise and workouts',
    Weight: 'Weight',
};

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

export const getHealthConnectPermissionStatus =
    async (): Promise<HealthConnectPermissionStatus> => {
        if (Platform.OS !== 'android') {
            return {
                available: false,
                allGranted: false,
                grantedPermissions: [],
                missingPermissions: [],
            };
        }

        try {
            const {
                getSdkStatus,
                initialize,
                getGrantedPermissions,
            } = require('react-native-health-connect');

            const status = await getSdkStatus();

            if (status !== 3) {
                return {
                    available: false,
                    allGranted: false,
                    grantedPermissions: [],
                    missingPermissions: REQUIRED_HEALTH_CONNECT_PERMISSIONS,
                };
            }

            await initialize();

            const granted = await getGrantedPermissions();

            const grantedPermissions =
                REQUIRED_HEALTH_CONNECT_PERMISSIONS.filter(required =>
                    granted.some(
                        (permission: HealthConnectPermission) =>
                            permission.accessType === required.accessType &&
                            permission.recordType === required.recordType
                    )
                );

            const missingPermissions =
                REQUIRED_HEALTH_CONNECT_PERMISSIONS.filter(
                    required =>
                        !grantedPermissions.some(
                            permission =>
                                permission.accessType === required.accessType &&
                                permission.recordType === required.recordType
                        )
                );

            const allGranted = missingPermissions.length === 0;

            await AsyncStorage.setItem(
                HEALTH_PERMISSION_KEY,
                allGranted ? 'granted' : 'denied'
            );

            return {
                available: true,
                allGranted,
                grantedPermissions,
                missingPermissions,
            };
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Unknown error';

            console.error(
                'Health Connect permission status error:',
                message
            );

            return {
                available: false,
                allGranted: false,
                grantedPermissions: [],
                missingPermissions: REQUIRED_HEALTH_CONNECT_PERMISSIONS,
            };
        }
    };

export const checkHealthConnectPermissions =
    async (): Promise<boolean> => {
        const status = await getHealthConnectPermissionStatus();

        return status.allGranted;
    };

export const requestHealthConnectPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const { getSdkStatus, initialize, requestPermission } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return false;
        
        await initialize();

        const granted = await requestPermission(
            REQUIRED_HEALTH_CONNECT_PERMISSIONS
        );

        const hasPermissions =
            REQUIRED_HEALTH_CONNECT_PERMISSIONS.every(required =>
                granted.some(
                    (permission: HealthConnectPermission) =>
                        permission.accessType === required.accessType &&
                        permission.recordType === required.recordType
                )
            );

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