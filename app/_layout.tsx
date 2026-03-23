import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        // step 1: Check for an existing session on app launch
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // step 2: Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        // step 3: Clean up the listener when the component unmounts
        return () => subscription.unsubscribe();
    }, []);

    // step 4: Handle navigation based on auth state
    useEffect(() => {
        if (loading) return;

        if (session) {
            router.replace('/(tabs)/dashboard');
        } else {
            router.replace('/(auth)/login');
        }
    }, [session, loading]);

    // step 5: Show a spinner while we check auth state
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}