import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';

type AuthMode = 'password' | 'magic-link';

export default function Login() {
    const [mode, setMode] = useState<AuthMode>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const { message } = useLocalSearchParams<{ message?: string }>();

    const handlePasswordLogin = async () => {
        if (!email || !password) {
            setError('Please enter your email and password.');
        
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) setError(error.message);

        setLoading(false);
    };

    const handleMagicLink = async () => {
        if (!email) {
            setError('Please enter your email address.');
        
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: 'pacewell://auth/callback' },
        });

        if (error) {
            setError(error.message);
        } else {
            setMagicLinkSent(true);
        }

        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
        
            return;
        }

        setLoading(true);

        await supabase.auth.resetPasswordForEmail(email);

        setError(null);
        setLoading(false);
        setError('Password reset email sent. Check your inbox.');
    };

    const handleSubmit = () => {
        mode === 'password' ? handlePasswordLogin() : handleMagicLink();
    };

    if (magicLinkSent) {
        return (
            <View style={styles.container}>
                <View style={styles.centred}>
                    <View style={styles.brandIcon}>
                        <Ionicons name="mail" size={32} color={theme.colors.white} />
                    </View>
                    <Text style={styles.title}>Check your inbox</Text>
                    <Text style={styles.subtitle}>
                        We sent a sign-in link to {email}. Tap it on your phone to open Pacewell.
                    </Text>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => setMagicLinkSent(false)}
                    >
                        <Text style={styles.secondaryButtonText}>Use a different email</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.brandIconWrapper}>
                    <View style={styles.brandIcon}>
                        <Ionicons name="flash" size={32} color={theme.colors.white} />
                    </View>
                </View>
                
                <Text style={styles.title}>Pacewell</Text>
                <Text style={styles.subtitle}>
                    Continue your wellness journey with personalised AI insights.
                </Text>
                
                {message && (
                <View style={styles.messageBox}>
                    <Ionicons name="mail-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.messageText}>{message}</Text>
                </View>
                )}
                
                <View style={styles.formCard}>
                    <View style={styles.toggle}>
                        <TouchableOpacity
                            style={[styles.toggleButton, mode === 'password' && styles.toggleButtonActive]}
                            onPress={() => { setMode('password'); setError(null); }}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={14}
                                color={mode === 'password' ? theme.colors.textDark : theme.colors.textSubtle}
                            />
                            <Text style={[
                                styles.toggleText,
                                mode === 'password' && styles.toggleTextActive,
                            ]}>
                                Password
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toggleButton, mode === 'magic-link' && styles.toggleButtonActive]}
                            onPress={() => { setMode('magic-link'); setError(null); }}
                        >
                            <Ionicons
                                name="sparkles-outline"
                                size={14}
                                color={mode === 'magic-link' ? theme.colors.textDark : theme.colors.textSubtle}
                            />
                            <Text style={[
                                styles.toggleText,
                                mode === 'magic-link' && styles.toggleTextActive,
                            ]}>
                                Magic Link
                            </Text>
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="mail-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="name@example.com"
                            placeholderTextColor={theme.colors.textLight}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                        />
                    </View>
                    
                    {mode === 'password' && (
                    <>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={18}
                                color={theme.colors.textSubtle}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={theme.colors.textLight}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.inputIconRight}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={theme.colors.textSubtle}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={handleForgotPassword}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </>
                    )}
                    
                    {error && (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                    
                    <TouchableOpacity
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >

                        {loading ? (
                        <ActivityIndicator color={theme.colors.white} />
                        ) : (
                        <View style={styles.buttonInner}>
                            <Text style={styles.primaryButtonText}>
                                {mode === 'password' ? 'Sign In' : 'Send Magic Link'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
                        </View>
                        )}

                    </TouchableOpacity>
                </View>
                
                <View style={styles.secureFooter}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textSubtle} />
                    <Text style={styles.secureText}>SECURE ACCESS</Text>
                </View>
                
                <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => router.push('/(auth)/register')}
                >
                    <Text style={styles.registerText}>
                        New to Pacewell?{' '}
                        <Text style={styles.registerTextBold}>Join now</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    inner: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xxl,
    },
    brandIconWrapper: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    brandIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadow.medium,
    },
    title: {
        ...theme.typography.screenTitle,
        color: theme.colors.textDark,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        lineHeight: 22,
    },
    messageBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    messageText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        flex: 1,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadow.small,
    },
    toggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        padding: 4,
        marginBottom: theme.spacing.lg,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: theme.radius.sm,
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.card,
        ...theme.shadow.small,
    },
    toggleText: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
    },
    toggleTextActive: {
        color: theme.colors.textDark,
        fontWeight: '600',
    },
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textBody,
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    inputIcon: {
        marginRight: theme.spacing.sm,
    },
    inputIconRight: {
        marginLeft: theme.spacing.sm,
        padding: 4,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: theme.colors.textDark,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: theme.spacing.md,
    },
    forgotPasswordText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.dangerLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
    },
    errorText: {
        ...theme.typography.label,
        color: theme.colors.danger,
        flex: 1,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        ...theme.shadow.small,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    primaryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        marginTop: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
    },
    secondaryButtonText: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    secureFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    secureText: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        letterSpacing: 1,
    },
    registerLink: {
        alignItems: 'center',
    },
    registerText: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
    },
    registerTextBold: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
});