import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        ...(Platform.OS !== 'web'
            ? { storage: AsyncStorage }
            : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
    },
});

if (Platform.OS !== 'web') {
    AppState.addEventListener(
        'change',
        state => {
            if (state === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        }
    );
}

export type DeepLinkResult = 'recovery' | 'authenticated' | null;

// handle authentication deep links and exchange their tokens for a session
export const handleDeepLink = async (
    url: string
): Promise<DeepLinkResult> => {
    try {
        const params: Record<string, string> = {};

        const parseParameters = (value: string) => {
            value.split('&').forEach(pair => {
                const separatorIndex = pair.indexOf('=');

                if (separatorIndex === -1) return;

                const key = pair.substring(0, separatorIndex);
                const parameterValue = pair.substring(separatorIndex + 1);

                if (key && parameterValue) {
                    params[decodeURIComponent(key)] =
                        decodeURIComponent(parameterValue);
                }
            });
        };

        const queryIndex = url.indexOf('?');
        const hashIndex = url.indexOf('#');

        if (queryIndex !== -1) {
            const queryEnd = hashIndex === -1 ? url.length : hashIndex;
            const queryString = url.substring(queryIndex + 1, queryEnd);

            parseParameters(queryString);
        }

        if (hashIndex !== -1) {
            const hashFragment = url.substring(hashIndex + 1);

            parseParameters(hashFragment);
        }

        const isPasswordRecovery = params.type === 'recovery';

        if (params.error_description) {
            throw new Error(params.error_description);
        }

        if (params.access_token && params.refresh_token) {
            const { error } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
            });

            if (error) throw error;

            return isPasswordRecovery ? 'recovery' : 'authenticated';
        }

        if (params.token_hash && params.type) {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: params.token_hash,
                type: params.type as any,
            });

            if (error) throw error;

            return isPasswordRecovery ? 'recovery' : 'authenticated';
        }

        return null;
    } catch (err) {
        console.error('Deep link error:', err);

        return null;
    }
};