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
        'HKWorkoutActivityTypeRunning': 'running',
        'HKWorkoutActivityTypeCycling': 'cycling',
        'HKWorkoutActivityTypeSwimming': 'swimming',
        'HKWorkoutActivityTypeWalking': 'walking',
        'HKWorkoutActivityTypeTraditionalStrengthTraining': 'strength',
        'HKWorkoutActivityTypeYoga': 'yoga',
        'HKWorkoutActivityTypeTennis': 'tennis',
        'HKWorkoutActivityTypeGolf': 'golf',
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

// ─── iOS HealthKit ────────────────────────────────────────────────────────────

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

        const asleepSamples = samples.filter((s: any) =>
            s.value === 'HKCategoryValueSleepAnalysisAsleepUnspecified' ||
            s.value === 'HKCategoryValueSleepAnalysisAsleepCore' ||
            s.value === 'HKCategoryValueSleepAnalysisAsleepDeep' ||
            s.value === 'HKCategoryValueSleepAnalysisAsleepREM'
        );

        const totalMs = asleepSamples.reduce((sum: number, s: any) => {
            return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
        }, 0);

        const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 2) / 2;

        if (totalHours === 0) return null;

        return {
            totalHours,
            quality: deriveSleepQuality(totalHours),
            startTime: samples[0].startDate,
            endTime: samples[samples.length - 1].endDate,
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

        let hrSamples: any[] = [];
        let restingHR: any = null;
        let hrv: any = null;

        try {
            hrSamples = await HealthKit.queryQuantitySamples(
                'HKQuantityTypeIdentifierHeartRate',
                { from: startDate, to: endDate, unit: 'count/min' }
            ) ?? [];
        } catch (err) { console.log('HealthKit HR not available'); }

        try {
            restingHR = await HealthKit.getMostRecentQuantitySample(
                'HKQuantityTypeIdentifierRestingHeartRate', 'count/min'
            );
        } catch (err) { console.log('HealthKit resting HR not available'); }

        try {
            hrv = await HealthKit.getMostRecentQuantitySample(
                'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'ms'
            );
        } catch (err) { console.log('HealthKit HRV not available'); }

        if (hrSamples.length === 0 && !restingHR) return null;

        const values = hrSamples.map((s: any) => s.quantity);
        const average = values.length > 0
            ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
            : 0;

        return {
            average,
            min: values.length > 0 ? Math.round(Math.min(...values)) : 0,
            max: values.length > 0 ? Math.round(Math.max(...values)) : 0,
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

        const steps = await HealthKit.queryQuantitySamples(
            'HKQuantityTypeIdentifierStepCount',
            { from: today, to: new Date(), unit: 'count' }
        );

        if (!steps || steps.length === 0) return null;

        const total = Math.round(
            steps.reduce((sum: number, s: any) => sum + s.quantity, 0)
        );

        return { count: total, date: getLocalDate() };
    } catch (err) {
        console.error('HealthKit steps error:', err);

        return null;
    }
};

const getHealthKitWeight = async (): Promise<number | null> => {
    try {
        const HealthKit = require('@kingstinct/react-native-healthkit').default;
        const sample = await HealthKit.getMostRecentQuantitySample(
            'HKQuantityTypeIdentifierBodyMass', 'kg'
        );

        return sample?.quantity ? Math.round(sample.quantity * 10) / 10 : null;
    } catch (err) {
        console.error('HealthKit weight error:', err);

        return null;
    }
};

// ─── Android Health Connect ───────────────────────────────────────────────────

const getHealthConnectSleep = async (): Promise<SleepData | null> => {
    try {
        const { getSdkStatus, initialize, readRecords } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return null;
        
        await initialize();
    
        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
        let records: any[] = [];

        try {
            const result = await readRecords('SleepSession', {
                timeRangeFilter: { operator: 'between', startTime, endTime },
            });

            records = result?.records ?? [];
        } catch (err) {
            console.log('Sleep permission not granted');

            return null;
        }
    
        if (records.length === 0) return null;
    
        const latest = records[records.length - 1];
    
        // sum only actual sleep stages (4=light, 5=REM, 6=deep)
        const SLEEP_STAGES = [4, 5, 6];
    
        let totalSleepMs = 0;
    
        if (latest.stages && latest.stages.length > 0) {
            totalSleepMs = latest.stages
                .filter((s: any) => SLEEP_STAGES.includes(s.stage))
                .reduce((sum: number, s: any) => {
                    const duration =
                    new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
                
                    return sum + duration;
            }, 0);
        } else {

            // no stages available — fall back to full session duration
            totalSleepMs = new Date(latest.endTime).getTime() - new Date(latest.startTime).getTime();
        }
    
        const totalHours = Math.round((totalSleepMs / (1000 * 60 * 60)) * 2) / 2;
    
        if (totalHours === 0) return null;
    
        // derive quality from sleep stage composition
        const totalStageMs = latest.stages?.reduce((sum: number, s: any) => {
            return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime());
        }, 0) ?? totalSleepMs;
    
        const deepMs = latest.stages
            ?.filter((s: any) => s.stage === 6)
            .reduce((sum: number, s: any) =>
                sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()), 0
            ) ?? 0;
    
        const remMs = latest.stages
            ?.filter((s: any) => s.stage === 5)
            .reduce((sum: number, s: any) =>
                sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()), 0
            ) ?? 0;
    
        const deepPercent = totalStageMs > 0 ? deepMs / totalStageMs : 0;
        const remPercent = totalStageMs > 0 ? remMs / totalStageMs : 0;
        const qualityScore = deepPercent + remPercent;
    
        let quality: EmojiScale;

        if (qualityScore > 0.4) quality = 5;
        else if (qualityScore > 0.3) quality = 4;
        else if (qualityScore > 0.2) quality = 3;
        else if (qualityScore > 0.1) quality = 2;
        else quality = 1;
    
        return {
            totalHours,
            quality,
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
        const { getSdkStatus, initialize, readRecords } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return [];
        
        await initialize();
    
        // use local date midnight to only get today's workouts
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        
        const startTime = today.toISOString();
        const endTime = new Date().toISOString();
    
        let records: any[] = [];

        try {
            const result = await readRecords('ExerciseSession', {
                timeRangeFilter: { operator: 'between', startTime, endTime },
            });

            records = result?.records ?? [];
        } catch (err) {
            console.log('Exercise permission not granted');

            return [];
        }
  
      // Map Health Connect exercise types to our ActivityType
      const exerciseTypeMap: Record<number, ActivityType> = {
        79: 'walking',
        56: 'running',
        8: 'cycling',
        82: 'swimming',
        64: 'strength',
        61: 'yoga',
        73: 'tennis',
        30: 'golf',
      };
  
      return records.map((w: any) => {
        const durationMinutes = Math.round(
          (new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / (1000 * 60)
        );
        return {
          id: w.metadata?.id ?? Math.random().toString(),
          activityType: exerciseTypeMap[w.exerciseType] ?? 'other',
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
        const { getSdkStatus, initialize, readRecords } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return null;

        await initialize();

        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const timeRange = {
            timeRangeFilter: { operator: 'between', startTime, endTime },
        };

        let hrRecords: any[] = [];

        try {
            const result = await readRecords('HeartRate', timeRange);

            hrRecords = result?.records ?? [];
        } catch (err) {
            return null;
        }

        if (hrRecords.length === 0) return null;

        const allValues = hrRecords.flatMap((r: any) =>
            r.samples?.map((s: any) => s.beatsPerMinute) ?? []
        );

        if (allValues.length === 0) return null;

        const average = Math.round(
            allValues.reduce((a: number, b: number) => a + b, 0) / allValues.length
        );

        return {
            average,
            min: Math.round(Math.min(...allValues)),
            max: Math.round(Math.max(...allValues)),
            resting: null,
            hrv: null,
            recordedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error('Health Connect heart rate error:', err);

        return null;
    }
};

const getHealthConnectSteps = async (): Promise<StepData | null> => {
    try {
        const { getSdkStatus, initialize, aggregateRecord } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return null;

        await initialize();

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        try {
            const result = await aggregateRecord({
                recordType: 'Steps',
                timeRangeFilter: {
                    operator: 'between',
                    startTime: today.toISOString(),
                    endTime: new Date().toISOString(),
                },
            });

            const total = result?.COUNT_TOTAL ?? 0;

            if (total === 0) return null;

            return { count: total, date: getLocalDate() };
        } catch (err) {
            console.log('Steps aggregation error:', err);

            return null;
        }
    } catch (err) {
        console.error('Health Connect steps error:', err);

        return null;
    }
};

const getHealthConnectWeight = async (): Promise<number | null> => {
    try {
        const { getSdkStatus, initialize, readRecords } = require('react-native-health-connect');
        const status = await getSdkStatus();

        if (status !== 3) return null;

        await initialize();

        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        let records: any[] = [];
        
        try {
            const result = await readRecords('Weight', {
                timeRangeFilter: { operator: 'between', startTime, endTime },
            });
            
            records = result?.records ?? [];
        } catch (err) {
            return null;
        }

        if (records.length === 0) {
            return null;
        }

        const latest = records[records.length - 1];

        return Math.round(latest.weight.inKilograms * 10) / 10;
    } catch (err) {
        console.error('Health Connect weight error:', err);

        return null;
    }
};

// ─── Unified Interface ────────────────────────────────────────────────────────

export const getHealthSummary = async (): Promise<HealthSummary> => {
    const isIOS = Platform.OS === 'ios';
    const [sleep, workouts, heartRate, steps, weight] = await Promise.all([
        isIOS ? getHealthKitSleep() : getHealthConnectSleep(),
        isIOS ? getHealthKitWorkouts() : getHealthConnectWorkouts(),
        isIOS ? getHealthKitHeartRate() : getHealthConnectHeartRate(),
        isIOS ? getHealthKitSteps() : getHealthConnectSteps(),
        isIOS ? getHealthKitWeight() : getHealthConnectWeight(),
    ]);

    return {
        sleep,
        workouts,
        heartRate,
        steps,
        weight,
        lastSynced: new Date().toISOString(),
    };
};

export const getSleepData = async (): Promise<SleepData | null> => {
    return Platform.OS === 'ios' ? getHealthKitSleep() : getHealthConnectSleep();
};

export const getRecentWorkouts = async (): Promise<WorkoutData[]> => {
    return Platform.OS === 'ios' ? getHealthKitWorkouts() : getHealthConnectWorkouts();
};

export const getHeartRateData = async (): Promise<HeartRateData | null> => {
    return Platform.OS === 'ios' ? getHealthKitHeartRate() : getHealthConnectHeartRate();
};

export const getStepData = async (): Promise<StepData | null> => {
    return Platform.OS === 'ios' ? getHealthKitSteps() : getHealthConnectSteps();
};