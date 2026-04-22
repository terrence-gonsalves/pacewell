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
        const parsedUrl = Linking.parse(url);
        
        // extract token hash from URL params
        const params = parsedUrl.queryParams;
        
        if (params?.token_hash && params?.type) {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: params.token_hash as string,
                type: params.type as any,
            });
            
            if (error) {
                console.error('Magic link verification error:', error.message);
            }
        } else if (parsedUrl.hostname === 'login-callback' || params?.access_token) {

            // handle access_token style deep links
            const accessToken = params?.access_token as string;
            const refreshToken = params?.refresh_token as string;
            
            if (accessToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                
                if (error) {
                    console.error('Session set error:', error.message);
                }
            }
        }
    } catch (err) {
        console.error('Deep link handling error:', err);
    }
};