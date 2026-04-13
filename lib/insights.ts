import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLocalDate } from './locale';

// ─── Constants ────────────────────────────────────────────────────────────────

const LAST_INSIGHTS_DATE_KEY = 'pacewell_last_insights_date';
const BEDTIME_KEY = 'pacewell_bedtime';

export const DEFAULT_BEDTIME = '22:00';
export const MIN_CHECKINS_FOR_INSIGHTS = 3;

// ─── Bedtime Settings ─────────────────────────────────────────────────────────

export const getBedtime = async (): Promise<string> => {
    const stored = await AsyncStorage.getItem(BEDTIME_KEY);

    return stored ?? DEFAULT_BEDTIME;
};

export const saveBedtime = async (time: string): Promise<void> => {
    await AsyncStorage.setItem(BEDTIME_KEY, time);
};

// ─── Insight Generation ───────────────────────────────────────────────────────

export const generateInsights = async (): Promise<{
    success: boolean;
    message: string;
}> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, message: 'No active session' };
        }

        // check minimum check-ins requirement
        const today = getLocalDate();
        const fourteenDaysAgo = getLocalDate(
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        );

        const { data: checkIns } = await supabase
            .from('daily_checkins')
            .select('id')
            .eq('user_id', user.id)
            .gte('date', fourteenDaysAgo);

        if (!checkIns || checkIns.length < MIN_CHECKINS_FOR_INSIGHTS) {
            return {
                success: false,
                message: `Need at least ${MIN_CHECKINS_FOR_INSIGHTS} check-ins to generate insights`,
            };
        }

        // call the Edge Function
        const { data, error } = await supabase.functions.invoke('generate-insights', {
            body: { user_id: user.id },
        });

        if (error) {
            console.error('Edge Function error:', error);

            return { success: false, message: error.message };
        }

        // mark insights as generated today
        await AsyncStorage.setItem(LAST_INSIGHTS_DATE_KEY, today);

        return { success: true, message: 'Insights generated successfully' };
    } catch (err) {
        console.error('Generate insights error:', err);

        return {
            success: false,
            message: err instanceof Error ? err.message : 'Unknown error',
        };
    }
};

export const hasGeneratedInsightsToday = async (): Promise<boolean> => {
    const lastDate = await AsyncStorage.getItem(LAST_INSIGHTS_DATE_KEY);

    return lastDate === getLocalDate();
};

export const shouldGenerateInsights = async (): Promise<boolean> => {
    const alreadyGenerated = await hasGeneratedInsightsToday();

    if (alreadyGenerated) return false;

    // check if user has enough check-ins
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const fourteenDaysAgo = getLocalDate(
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    const { data: checkIns } = await supabase
        .from('daily_checkins')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', fourteenDaysAgo);

    return (checkIns?.length ?? 0) >= MIN_CHECKINS_FOR_INSIGHTS;
};