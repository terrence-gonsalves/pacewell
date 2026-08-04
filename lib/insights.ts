import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLocalDate } from './locale';

let isGenerating = false;

// ─── Constants ────────────────────────────────────────────────────────────────

const LAST_INSIGHTS_DATE_KEY = 'pacewell_last_insights_date';
const BEDTIME_KEY = 'pacewell_bedtime';
const GENERATING_KEY = 'pacewell_insights_generating';

export const DEFAULT_BEDTIME = '22:00';
export const MIN_CHECKINS_FOR_INSIGHTS = 3;

// ─── Bedtime Settings ─────────────────────────────────────────────────────────

export const getBedtime = async (): Promise<string | null> => {
    const stored = await AsyncStorage.getItem(BEDTIME_KEY);
    
    return stored ?? null;
};

export const saveBedtime = async (time: string): Promise<void> => {
    await AsyncStorage.setItem(BEDTIME_KEY, time);
};

// ─── Insight Generation ───────────────────────────────────────────────────────

export const generateInsights = async (): Promise<{
    success: boolean;
    message: string;
    already_generated?: boolean;
}> => {

    // prevent duplicate simultaneous calls
    if (isGenerating) {
        return { success: false, message: 'Already generating' };
    }

    isGenerating = true;

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            const authMessage = authError.message.toLowerCase();
        
            if (authMessage.includes('network') || authMessage.includes('fetch') || authMessage.includes('request failed')) {
                return {
                    success: false,
                    message: 'Unable to connect. Check your internet connection and try again.',
                };
            }
        
            return {
                success: false,
                message: 'Unable to verify your session. Please try again.',
            };
        }
        
        if (!user) {
            return {
                success: false,
                message: 'Your session has expired. Please sign in again.',
            };
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
                message: `Complete at least ${MIN_CHECKINS_FOR_INSIGHTS} check-ins in the last 14 days to generate insights`,
            };
        }

        // call the Edge Function
        const { data, error } = await supabase.functions.invoke('generate-insights', {
            body: {},
        });

        if (error) {
            console.error('Edge Function error:', error.message);

            return { success: false, message: error.message };
        }

        // mark insights as generated today
        await AsyncStorage.setItem(LAST_INSIGHTS_DATE_KEY, today);

        return {
            success: true,
            message: data?.message ?? 'Insights generated successfully',
            already_generated: data?.already_generated ?? false,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Generate insights error:', message);

        const isNetworkError =
            message.toLowerCase().includes('network') ||
            message.toLowerCase().includes('fetch') ||
            message.toLowerCase().includes('request failed');

        return {
            success: false,
            message: isNetworkError
                ? 'Unable to connect. Check your internet connection and try again.'
                : 'Unable to generate insights right now. Please try again.',
        };
    } finally {
        isGenerating = false;
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