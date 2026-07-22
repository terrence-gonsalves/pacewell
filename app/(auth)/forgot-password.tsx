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

export default function ForgotPassword() {
    const params = useLocalSearchParams<{ email?: string }>();
    const initialEmail = typeof params.email === 'string' ? params.email : '';

    const [email, setEmail] = useState(initialEmail);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);

    const handleSendResetLink = async () => {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setError('Please enter your email address.');

            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(
            trimmedEmail,
            {
                redirectTo: 'pacewell://auth/callback?type=recovery',
            }
        );

        if (error) {
            setError(error.message);
            setLoading(false);

            return;
        }

        setEmail(trimmedEmail);
        setEmailSent(true);
        setLoading(false);
    };

    if (emailSent) {
        return (
            <View style={styles.container}>
                <View style={styles.centred}>
                    <View style={styles.brandIcon}>
                        <Ionicons
                            name="mail-outline"
                            size={34}
                            color={theme.colors.white}
                        />
                    </View>

                    <Text style={styles.title}>Check your email</Text>

                    <Text style={styles.subtitle}>
                        We sent a password reset link to:
                    </Text>

                    <Text style={styles.emailConfirmation}>{email}</Text>

                    <Text style={styles.helperText}>
                        The link may take a few minutes to arrive. Check your spam or junk folder if you do not see it.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.replace('/(auth)/login')}
                    >
                        <View style={styles.buttonInner}>
                            <Text style={styles.primaryButtonText}>
                                Return to Sign In
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color={theme.colors.white}
                            />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                            setEmailSent(false);
                            setError(null);
                        }}
                    >
                        <Text style={styles.secondaryButtonText}>
                            Use a different email
                        </Text>
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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color={theme.colors.textDark}
                    />

                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.brandIconWrapper}>
                    <View style={styles.brandIcon}>
                        <Ionicons
                            name="key-outline"
                            size={32}
                            color={theme.colors.white}
                        />
                    </View>
                </View>

                <Text style={styles.title}>Reset your password</Text>

                <Text style={styles.subtitle}>
                    Enter the email address associated with your Pacewell account. We will send you a secure link to create a new password.
                </Text>

                <View style={styles.formCard}>
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
                            editable={!loading}
                            returnKeyType="send"
                            onSubmitEditing={handleSendResetLink}
                        />
                    </View>

                    {error && (
                    <View style={styles.errorBox}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={16}
                            color={theme.colors.danger}
                        />

                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={handleSendResetLink}
                        disabled={loading}
                    >
                        {loading ? (
                        <ActivityIndicator color={theme.colors.white} />
                        ) : (
                        <View style={styles.buttonInner}>
                            <Text style={styles.primaryButtonText}>
                                Send Reset Link
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color={theme.colors.white}
                            />
                        </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.secureFooter}>
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={14}
                        color={theme.colors.textSubtle}
                    />

                    <Text style={styles.secureText}>SECURE PASSWORD RECOVERY</Text>
                </View>
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
    backButton: {
        position: 'absolute',
        top: theme.spacing.xxl,
        left: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
        zIndex: 1,
    },
    backButtonText: {
        ...theme.typography.label,
        color: theme.colors.textDark,
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
        marginBottom: theme.spacing.lg,
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
    helperText: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
    },
    emailConfirmation: {
        ...theme.typography.body,
        color: theme.colors.textDark,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    formCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadow.small,
    },
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textBody,
        marginBottom: theme.spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
    },
    inputIcon: {
        marginRight: theme.spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: theme.colors.textDark,
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
        width: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        ...theme.shadow.small,
    },
    secondaryButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.sm,
    },
    secondaryButtonText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        fontWeight: '600',
        textAlign: 'center',
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
});