import { useEffect, useState, useRef } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import CustomSplash from './splash';
import {
    setupAndroidChannel,
    requestNotificationPermissions,
    scheduleDailyCheckInNotification,
} from '../lib/notifications';

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
            age: meta.age ?? 40,
            primary_activity: meta.primary_activity ?? 'walking',
            activity_level: meta.activity_level ?? 'moderate',
            health_goals: meta.health_goals ?? [],
        });
    }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCustomSplash, setShowCustomSplash] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    // ─── Notification ──────────────────────────────────────────────────────────

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

    // ─── Hide Native Splash Screen ───────────────────────────────────────────────

    useEffect(() => {
        if (!loading) {

            // hide native splash immediately — our custom splash takes over
            SplashScreen.hideAsync();
            setAuthReady(true);
        }
    }, [loading]);

    const handleSplashComplete = () => {
        setShowCustomSplash(false);

        // navigate based on auth state
        if (session) {
            router.replace('/(tabs)/dashboard');
        } else {
            router.replace('/(auth)/login');
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
        <StatusBar hidden={showCustomSplash} />
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="log-activity" />
            <Stack.Screen name="splash" options={{ headerShown: false }} />
        </Stack>
        
        {showCustomSplash && authReady && (
            <CustomSplash onComplete={handleSplashComplete} />
        )}
        
        {showCustomSplash && !authReady && (
            <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#2E7D52',
                zIndex: 998,
            }} />
        )}
        </>
    );
}