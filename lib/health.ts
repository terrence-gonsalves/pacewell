import { Platform } from 'react-native';
import {
    SleepData,
    WorkoutData,
    HeartRateData,
    StepData,
    HealthSummary,
    ActivityType,
    EmojiScale,
} from '../types/health';
import { getLocalDate } from './locale';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const deriveSleepQuality = (hours: number): EmojiScale => {
    if (hours < 5) return 1;
    if (hours < 6) return 2;
    if (hours < 7) return 3;
    if (hours < 8) return 4;

    return 5;
};

const mapWorkoutType = (type: string): ActivityType => {
    const map: Record<string, ActivityType> = {

        // HealthKit types
        'HKWorkoutActivityTypeRunning': 'running',
        'HKWorkoutActivityTypeCycling': 'cycling',
        'HKWorkoutActivityTypeSwimming': 'swimming',
        'HKWorkoutActivityTypeWalking': 'walking',
        'HKWorkoutActivityTypeTraditionalStrengthTraining': 'strength',
        'HKWorkoutActivityTypeYoga': 'yoga',
        'HKWorkoutActivityTypeTennis': 'tennis',
        'HKWorkoutActivityTypeGolf': 'golf',
        
        // Health Connect types
        'RUNNING': 'running',
        'BIKING': 'cycling',
        'SWIMMING_POOL': 'swimming',
        'WALKING': 'walking',
        'WEIGHT_TRAINING': 'strength',
        'YOGA': 'yoga',
        'TENNIS': 'tennis',
        'GOLF': 'golf',
    };

    return map[type] ?? 'other';
};

// ─── iOS HealthKit Implementation ─────────────────────────────────────────────

const getHealthKitSleep = async (): Promise<SleepData | null> => {
    try {
        const HealthKit = require('@kingstinct/react-native-healthkit').default;

        const endDate = new Date();
        const startDate = new Date();
        
        startDate.setHours(startDate.getHours() - 16);

        const samples = await HealthKit.querySamples(
            'HKCategoryTypeIdentifierSleepAnalysis',
            { from: startDate, to: endDate }
        );

        if (!samples || samples.length === 0) return null;

        // calculate total sleep duration
        const asleepSamples = samples.filter((s: any) =>
            s.value === 'HKCategoryValueSleepAnalysisAsleepUnspecified' ||
            s.value === 'HKCategoryValueSleepAnalysisAsleepCore' ||
            s.value === 'HKCategoryValueSleepAnalysisAsleepDeep' ||
            s.value === 'HKCategoryValueSleepAnalysisAsleepREM'
        );

        const totalMs = asleepSamples.reduce((sum: number, s: any) => {
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();

            return sum + (end - start);
        }, 0);

        const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 2) / 2;

        if (totalHours === 0) return null;

        const firstSample = samples[0];
        const lastSample = samples[samples.length - 1];

        return {
            totalHours,
            quality: deriveSleepQuality(totalHours),
            startTime: firstSample.startDate,
            endTime: lastSample.endDate,
            source: 'healthkit',
        };
    } catch (err) {
        console.error('HealthKit sleep error:', err);

        return null;
    }
};

const getHealthKitWorkouts = async (): Promise<WorkoutData[]> => {
    try {
        const HealthKit = require('@kingstinct/react-native-healthkit').default;

        const endDate = new Date();
        const startDate = new Date();
        
        startDate.setHours(startDate.getHours() - 24);

        const workouts = await HealthKit.queryWorkoutSamples({
            from: startDate,
            to: endDate,
        });

        if (!workouts || workouts.length === 0) return [];

        return workouts.map((w: any) => ({
            id: w.uuid,
            activityType: mapWorkoutType(w.workoutActivityType),
            durationMinutes: Math.round(w.duration / 60),
            startTime: w.startDate,
            endTime: w.endDate,
            activeCalories: w.totalEnergyBurned?.quantity ?? null,
            source: 'healthkit',
        }));
    } catch (err) {
        console.error('HealthKit workouts error:', err);

        return [];
    }
};

const getHealthKitHeartRate = async (): Promise<HeartRateData | null> => {
    try {
        const HealthKit = require('@kingstinct/react-native-healthkit').default;

        const endDate = new Date();
        const startDate = new Date();

        startDate.setDate(startDate.getDate() - 1);

        const [hrSamples, restingHR, hrv] = await Promise.all([
            HealthKit.queryQuantitySamples(
                'HKQuantityTypeIdentifierHeartRate',
                { from: startDate, to: endDate, unit: 'count/min' }
            ),
            HealthKit.getMostRecentQuantitySample(
                'HKQuantityTypeIdentifierRestingHeartRate',
                'count/min'
            ),
            HealthKit.getMostRecentQuantitySample(
                'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
                'ms'
            ),
        ]);

        if (!hrSamples || hrSamples.length === 0) return null;

        const values = hrSamples.map((s: any) => s.quantity);
        const average = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
        const min = Math.round(Math.min(...values));
        const max = Math.round(Math.max(...values));

        return {
            average,
            min,
            max,
            resting: restingHR?.quantity ? Math.round(restingHR.quantity) : null,
            hrv: hrv?.quantity ? Math.round(hrv.quantity) : null,
            recordedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error('HealthKit heart rate error:', err);

        return null;
    }
};

const getHealthKitSteps = async (): Promise<StepData | null> => {
    try {
        const HealthKit = require('@kingstinct/react-native-healthkit').default;

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const endDate = new Date();

        const steps = await HealthKit.queryQuantitySamples(
            'HKQuantityTypeIdentifierStepCount',
            { from: today, to: endDate, unit: 'count' }
        );

        if (!steps || steps.length === 0) return null;

        const total = Math.round(
            steps.reduce((sum: number, s: any) => sum + s.quantity, 0)
        );

        return {
            count: total,
            date: getLocalDate(),
        };
    } catch (err) {
        console.error('HealthKit steps error:', err);

        return null;
    }
};

// ─── Android Health Connect Implementation ────────────────────────────────────

const getHealthConnectSleep = async (): Promise<SleepData | null> => {
    try {
        const { readRecords, initialize } = require('expo-health-connect');

        await initialize();

        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString();

        const { records } = await readRecords('SleepSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime,
                endTime,
            },
        });

        if (!records || records.length === 0) return null;

        const latest = records[records.length - 1];
        const startMs = new Date(latest.startTime).getTime();
        const endMs = new Date(latest.endTime).getTime();
        const totalHours = Math.round(((endMs - startMs) / (1000 * 60 * 60)) * 2) / 2;

        if (totalHours === 0) return null;

        return {
            totalHours,
            quality: deriveSleepQuality(totalHours),
            startTime: latest.startTime,
            endTime: latest.endTime,
            source: 'health_connect',
        };
    } catch (err) {
        console.error('Health Connect sleep error:', err);

        return null;
    }
};

const getHealthConnectWorkouts = async (): Promise<WorkoutData[]> => {
    try {
        const { readRecords, initialize } = require('expo-health-connect');

        await initialize();

        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { records } = await readRecords('ExerciseSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime,
                endTime,
            },
        });

        if (!records || records.length === 0) return [];

        return records.map((w: any) => {
            const startMs = new Date(w.startTime).getTime();
            const endMs = new Date(w.endTime).getTime();
            const durationMinutes = Math.round((endMs - startMs) / (1000 * 60));

            return {
                id: w.metadata?.id ?? Math.random().toString(),
                activityType: mapWorkoutType(w.exerciseType ?? ''),
                durationMinutes,
                startTime: w.startTime,
                endTime: w.endTime,
                activeCalories: null,
                source: 'health_connect',
            };
        });
    } catch (err) {
        console.error('Health Connect workouts error:', err);

        return [];
    }
};

const getHealthConnectHeartRate = async (): Promise<HeartRateData | null> => {
    try {
        const { readRecords, initialize } = require('expo-health-connect');

        await initialize();

        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [hrResult, restingResult, hrvResult] = await Promise.all([
            readRecords('HeartRate', {
                timeRangeFilter: { operator: 'between', startTime, endTime },
            }),
            readRecords('RestingHeartRate', {
                timeRangeFilter: { operator: 'between', startTime, endTime },
            }),
            readRecords('HeartRateVariabilityRmssd', {
                timeRangeFilter: { operator: 'between', startTime, endTime },
            }),
        ]);

        const hrRecords = hrResult.records ?? [];

        if (hrRecords.length === 0) return null;

        const allValues = hrRecords.flatMap((r: any) =>
            r.samples?.map((s: any) => s.beatsPerMinute) ?? []
        );

        if (allValues.length === 0) return null;

        const average = Math.round(allValues.reduce((a: number, b: number) => a + b, 0) / allValues.length);
        const min = Math.round(Math.min(...allValues));
        const max = Math.round(Math.max(...allValues));

        const restingRecords = restingResult.records ?? [];
        const resting = restingRecords.length > 0
            ? Math.round(restingRecords[restingRecords.length - 1].beatsPerMinute)
            : null;

        const hrvRecords = hrvResult.records ?? [];
        const hrv = hrvRecords.length > 0
            ? Math.round(hrvRecords[hrvRecords.length - 1].heartRateVariabilityMillis)
            : null;

        return {
            average,
            min,
            max,
            resting,
            hrv,
            recordedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error('Health Connect heart rate error:', err);

        return null;
    } 
};

const getHealthConnectSteps = async (): Promise<StepData | null> => {
    try {
        const { readRecords, initialize } = require('expo-health-connect');
        await initialize();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { records } = await readRecords('Steps', {
            timeRangeFilter: {
                operator: 'between',
                startTime: today.toISOString(),
                endTime: new Date().toISOString(),
            },
        });

        if (!records || records.length === 0) return null;

        const total = records.reduce((sum: number, r: any) => sum + r.count, 0);

        return {
            count: total,
            date: getLocalDate(),
        };
    } catch (err) {
        console.error('Health Connect steps error:', err);

        return null;
    }
};

// ─── Unified Interface ────────────────────────────────────────────────────────

export const getHealthSummary = async (): Promise<HealthSummary> => {
    const isIOS = Platform.OS === 'ios';

    const [sleep, workouts, heartRate, steps] = await Promise.all([
        isIOS ? getHealthKitSleep() : getHealthConnectSleep(),
        isIOS ? getHealthKitWorkouts() : getHealthConnectWorkouts(),
        isIOS ? getHealthKitHeartRate() : getHealthConnectHeartRate(),
        isIOS ? getHealthKitSteps() : getHealthConnectSteps(),
    ]);

    return {
        sleep,
        workouts,
        heartRate,
        steps,
        lastSynced: new Date().toISOString(),
    };
};

export const getSleepData = async (): Promise<SleepData | null> => {
    return Platform.OS === 'ios'
        ? getHealthKitSleep()
        : getHealthConnectSleep();
};

export const getRecentWorkouts = async (): Promise<WorkoutData[]> => {
    return Platform.OS === 'ios'
        ? getHealthKitWorkouts()
        : getHealthConnectWorkouts();
};

export const getHeartRateData = async (): Promise<HeartRateData | null> => {
    return Platform.OS === 'ios'
        ? getHealthKitHeartRate()
        : getHealthConnectHeartRate();
};

export const getStepData = async (): Promise<StepData | null> => {
    return Platform.OS === 'ios'
        ? getHealthKitSteps()
        : getHealthConnectSteps();
};