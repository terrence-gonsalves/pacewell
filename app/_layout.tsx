import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import {
    setupAndroidChannel,
    requestNotificationPermissions,
    scheduleDailyCheckInNotification,
} from '../lib/notifications';

// keep splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

const ensureProfile = async (session: Session) => {
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

    if (!existingProfile) {
        const meta = session.user.user_metadata;

        await supabase.from('profiles').insert({
            id: session.user.id,
            full_name: meta.full_name ?? 'Pacewell User',
            age: meta.age ?? 50,
            primary_activity: meta.primary_activity ?? 'walking',
            activity_level: meta.activity_level ?? 'moderate',
            health_goals: meta.health_goals ?? [],
        });
    }
};

 // ─── Root Component ──────────────────────────────────────────────────────────

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    // ─── Notification ──────────────────────────────────────────────────────────────

    useEffect(() => {
        setupAndroidChannel();

        notificationListener.current = Notifications.addNotificationReceivedListener(
            notification => {
                console.log('Notification received:', notification);
            }
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            response => {
                const screen = response.notification.request.content.data?.screen;

                if (screen === 'checkin') {
                    router.push('/(tabs)/checkin');
                }
            }
        );

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    // ─── Auth ──────────────────────────────────────────────────────────────

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session) {
                    await ensureProfile(session);

                    const granted = await requestNotificationPermissions();

                    if (granted) {
                        await scheduleDailyCheckInNotification();
                    }
                }

                setSession(session);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // ─── Navigation ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (loading) return;
      
        const timer = setTimeout(async () => {
            if (session) {
                router.replace('/(tabs)/dashboard');
            } else {
                router.replace('/(auth)/login');
            }

            // hide splash screen after navigation has been triggered
            // small delay ensures the new screen has rendered
            setTimeout(async () => {
                await SplashScreen.hideAsync();
            }, 100);
        }, 0);
      
        return () => clearTimeout(timer);
    }, [session, loading]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E7D52' }}>
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    // ─── Stack ──────────────────────────────────────────────────────────────

    return (
        <>
            <StatusBar hidden />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="edit-profile" />
                <Stack.Screen name="log-activity" />
            </Stack>
        </>
    );
}