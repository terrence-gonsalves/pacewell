import { useEffect, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';

export default function AuthCallback() {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const completeCallback = async () => {
            try {

                /*
                 * The root layout processes the incoming authentication link.
                 * Give it a moment to update the Supabase session before
                 * deciding where this callback route should continue.
                 */
                await new Promise(resolve => setTimeout(resolve, 750));

                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (error) {
                    setError(error.message);

                    return;
                }

                if (session) {
                    router.replace('/(tabs)/profile');

                    return;
                }

                router.replace('/(auth)/login');
            } catch {
                if (isMounted) {
                    setError('We could not complete the email confirmation.');
                }
            }
        };

        completeCallback();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <View style={styles.container}>
            {error ? (
                <>
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={34}
                            color={theme.colors.danger}
                        />
                    </View>

                    <Text style={styles.title}>Confirmation issue</Text>

                    <Text style={styles.message}>{error}</Text>
                </>
            ) : (
                <>
                    <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                    />

                    <Text style={styles.title}>Confirming email change</Text>

                    <Text style={styles.message}>Pacewell is completing your email confirmation.</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.background,
    },
    iconContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.dangerLight,
    },
    title: {
        ...theme.typography.screenTitle,
        color: theme.colors.textDark,
        textAlign: 'center',
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    message: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        lineHeight: 22,
    },
});