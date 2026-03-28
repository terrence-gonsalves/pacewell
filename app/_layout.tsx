import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import {
    setupAndroidChannel,
    requestNotificationPermissions,
    scheduleDailyCheckInNotification,
} from '../lib/notifications';

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

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        
        // set up Android notification channel
        setupAndroidChannel();

        // listen for notifications received while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(
            notification => {
                console.log('Notification received:', notification);
            }
        );

        // listen for notification taps
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

                    // request notification permissions and schedule after login
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

    useEffect(() => {
        if (loading) return;

        // small delay to allow navigation to fully mount
        const timer = setTimeout(() => {
            if (session) {
                router.replace('/(tabs)/dashboard');
            } else {
                router.replace('/(auth)/login');
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [session, loading]);

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
            <Stack.Screen name="edit-profile" />
        </Stack>
    );
}