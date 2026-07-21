import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
    setupAndroidChannel,
} from '../lib/notifications';
import {
    getSyncSettings,
    scheduleBackgroundSync,
} from '../lib/syncManager';
import {
    generateInsights,
} from '../lib/insights';
import { handleDeepLink } from '../lib/supabase';
import CustomSplash from './splash';

SplashScreen.preventAutoHideAsync();

// ─── Ensure Profile Exists ────────────────────────────────────────────────────

const ensureProfile = async (session: Session) => {
    const meta = session.user.user_metadata;

    const { error } = await supabase
        .from('profiles')
        .upsert(
            {
                id: session.user.id,
                full_name: meta.full_name ?? 'Pacewell User',
                age: meta.age ?? 40,
                primary_activity: meta.primary_activity ?? 'walking',
                activity_level: meta.activity_level ?? 'moderate',
                health_goals: meta.health_goals ?? [],
            },
            {
                onConflict: 'id',
                ignoreDuplicates: true,
            }
        );

    if (error) {
        throw error;
    }
};

// ─── Initialize Background Services ──────────────────────────────────────────

const initializeBackgroundSync = async () => {
    try {
        const settings = await getSyncSettings();

        if (settings.enabled) {
            await scheduleBackgroundSync(settings.intervalHours);
        }
    } catch (err) {
        console.error('Background sync init error:', err);
    }
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCustomSplash, setShowCustomSplash] = useState(true);

    // use a ref so handleSplashComplete always has the latest session value
    const sessionRef = useRef<Session | null>(null);

    // track whether splash has completed so post-splash auth changes can navigate
    const splashCompleteRef = useRef(false);

    // preserve password recovery routing while the splash screen is active
    const passwordRecoveryRef = useRef(false);

    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        setupAndroidChannel();
        initializeBackgroundSync();

        // handle deep links when app is already open
        const linkingSub = Linking.addEventListener('url', async ({ url }) => {
            await handleDeepLink(url);

            if (Linking.parse(url).queryParams?.type === 'recovery') {
                passwordRecoveryRef.current = true;
                router.replace('/(auth)/reset-password');
            }
        });

        // handle deep link that launched the app
        Linking.getInitialURL().then(async url => {
            if (!url) return;

            await handleDeepLink(url);

            if (Linking.parse(url).queryParams?.type === 'recovery') {
                passwordRecoveryRef.current = true;
                router.replace('/(auth)/reset-password');
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(
            notification => {
                console.log('Notification received:', notification);
            }
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            async response => {
                const data = response.notification.request.content.data;
                const screen = data?.screen;
                const action = data?.action;

                if (screen === 'checkin') {
                    router.push('/(tabs)/checkin');
                } else if (screen === 'insights') {
                    router.push('/(tabs)/insights');

                    if (action === 'generate') {
                        await generateInsights();
                    }
                }
            }
        );

        return () => {
            linkingSub.remove();
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) {
                const isInvalidRefreshToken = error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token');
    
                if (isInvalidRefreshToken) {
                    console.warn('Stored auth session is no longer valid. Clearing local session.');
    
                    await supabase.auth.signOut({
                        scope: 'local',
                    });
    
                    sessionRef.current = null;

                    setSession(null);
                    setLoading(false);
    
                    return;
                }
    
                console.error(
                    'Initial session error:',
                    error
                );
            }
    
            sessionRef.current = session;

            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            sessionRef.current = session;
            setSession(session);
        
            if (event === 'PASSWORD_RECOVERY') {
                passwordRecoveryRef.current = true;
            }
            
            if (splashCompleteRef.current) {
                if (passwordRecoveryRef.current && session) {
                    router.replace('/(auth)/reset-password');
                } else if (session) {
                    router.replace('/(tabs)/dashboard');
                } else {
                    router.replace('/(auth)/login');
                }
            }
        
            if (session && event !== 'PASSWORD_RECOVERY') {
                ensureProfile(session).catch(
                    err => console.error('ensureProfile error:', err)
                );
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleCustomSplashLayout = async () => {
        if (!loading) {
            await SplashScreen.hideAsync();
        }
    };

    const handleSplashComplete = () => {
        splashCompleteRef.current = true;
        setShowCustomSplash(false);
    
        if (passwordRecoveryRef.current) {
            router.replace('/(auth)/reset-password');
    
            return;
        }
    
        // use the ref to get the latest session value — not the closure value
        if (sessionRef.current) {
            router.replace('/(tabs)/dashboard');
        } else {
            router.replace('/(auth)/login');
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            <StatusBar hidden />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="edit-profile" />
                <Stack.Screen name="log-activity" />
            </Stack>

            {showCustomSplash && (
            <View
                style={styles.splashLayer}
                onLayout={handleCustomSplashLayout}
            >
                {!loading && (
                <CustomSplash
                    onComplete={handleSplashComplete}
                />
                )}
            </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    splashLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#265946',
        zIndex: 999,
    },
});