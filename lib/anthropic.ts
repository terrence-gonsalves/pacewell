import { supabase } from './supabase';

export const generateInsights = async (): Promise<{
    success: boolean;
    message?: string;
}> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { success: false, message: 'No active session' };
        }

        console.log('Invoking Edge Function...');

        const { data, error } = await supabase.functions.invoke('generate-insights');

        console.log('Edge Function response data:', JSON.stringify(data));
        console.log('Edge Function response error:', JSON.stringify(error));

        if (error) {
            console.error('Edge Function error:', error);

            return { success: false, message: error.message };
        }

        if (data?.message) {

            // not enough data yet — not an error, just informational
            return { success: true, message: data.message };
        }

        return { success: true };

    } catch (err) {
        console.error('generateInsights error:', err);
        
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Unknown error',
        };
    }
};