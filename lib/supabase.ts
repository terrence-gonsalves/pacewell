import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// handle magic link and OAuth deep links, parses the token from the URL and exchanges it for a session
export const handleDeepLink = async (url: string) => {
    try {
        console.log('=== DEEP LINK URL ===', url);
        
        // supabase auth links use hash fragments (#access_token=...)
        const hashIndex = url.indexOf('#');

        if (hashIndex === -1) {
            console.log('=== NO HASH FRAGMENT FOUND ===');
            return;
        }

        const hashFragment = url.substring(hashIndex + 1);
        console.log('=== HASH FRAGMENT ===', hashFragment);

        // parse the hash fragment as URL params
        const params: Record<string, string> = {};
        
        hashFragment.split('&').forEach(pair => {
            const [key, value] = pair.split('=');

            if (key && value) {
                params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
        });

        console.log('=== PARSED PARAMS ===', JSON.stringify(params));
        
        if (params.access_token && params.refresh_token) {
            console.log('=== SETTING SESSION FROM HASH ===');
            const { data, error } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
            });
            console.log('=== SESSION RESULT ===', error ? error.message : 'success', data?.session?.user?.email);
        } else if (params.token_hash && params.type) {
            console.log('=== VERIFYING OTP ===');
            const { error } = await supabase.auth.verifyOtp({
                token_hash: params.token_hash,
                type: params.type as any,
            });
            console.log('=== OTP RESULT ===', error ? error.message : 'success');
        } else {
            console.log('=== NO VALID TOKEN IN HASH ===', params);
        }
    } catch (err) {
        console.error('=== DEEP LINK ERROR ===', err);
    }
};