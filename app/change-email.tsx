import { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

export default function ChangeEmail() {
    const [currentEmail, setCurrentEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestSent, setRequestSent] = useState(false);

    useEffect(() => {
        const loadCurrentEmail = async () => {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error) {
                setError(error.message);
                setLoadingUser(false);

                return;
            }

            if (!user?.email) {
                setError('We could not find the email address for this account.');
                setLoadingUser(false);

                return;
            }

            setCurrentEmail(user.email);
            setLoadingUser(false);
        };

        loadCurrentEmail();
    }, []);

    const handleChangeEmail = async () => {
        const trimmedNewEmail = newEmail.trim().toLowerCase();
        const trimmedConfirmEmail = confirmEmail.trim().toLowerCase();
        const normalizedCurrentEmail = currentEmail.trim().toLowerCase();

        if (!trimmedNewEmail || !trimmedConfirmEmail) {
            setError('Please enter and confirm your new email address.');

            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(trimmedNewEmail)) {
            setError('Please enter a valid email address.');

            return;
        }

        if (trimmedNewEmail !== trimmedConfirmEmail) {
            setError('The email addresses do not match.');

            return;
        }

        if (trimmedNewEmail === normalizedCurrentEmail) {
            setError('Your new email address must be different from your current email.');

            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser(
            {
                email: trimmedNewEmail,
            },
            {
                emailRedirectTo: 'pacewell://auth/callback',
            }
        );

        if (error) {
            setError(error.message);
            setLoading(false);

            return;
        }

        setNewEmail(trimmedNewEmail);
        setRequestSent(true);
        setLoading(false);
    };

    if (loadingUser) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                />
            </View>
        );
    }

    if (requestSent) {
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
                        We sent confirmation instructions for changing your Pacewell email address.
                    </Text>

                    <View style={styles.emailSummary}>
                        <Text style={styles.summaryLabel}>Current email</Text>
                        <Text style={styles.summaryValue}>{currentEmail}</Text>

                        <View style={styles.summaryDivider} />

                        <Text style={styles.summaryLabel}>New email</Text>
                        <Text style={styles.summaryValue}>{newEmail}</Text>
                    </View>

                    <Text style={styles.helperText}>
                        For security, you may need to approve the change from both email addresses. Your account will continue using
                        your current email until the confirmations are complete.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.replace('/(tabs)/profile')}
                    >
                        <View style={styles.buttonInner}>
                            <Text style={styles.primaryButtonText}>
                                Return to Profile
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color={theme.colors.white}
                            />
                        </View>
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
                            name="mail-outline"
                            size={32}
                            color={theme.colors.white}
                        />
                    </View>
                </View>

                <Text style={styles.title}>Change email address</Text>

                <Text style={styles.subtitle}>
                    Enter the new email address you would like to use for your Pacewell account.
                </Text>

                <View style={styles.formCard}>
                    <Text style={styles.inputLabel}>Current Email</Text>

                    <View style={styles.readOnlyWrapper}>
                        <Ionicons
                            name="lock-closed-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />

                        <Text style={styles.readOnlyText}>
                            {currentEmail}
                        </Text>
                    </View>

                    <Text style={styles.inputLabel}>New Email Address</Text>

                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="mail-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="new@example.com"
                            placeholderTextColor={theme.colors.textLight}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            editable={!loading}
                            returnKeyType="next"
                        />
                    </View>

                    <Text style={styles.inputLabel}>
                        Confirm New Email Address
                    </Text>

                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="mail-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Confirm your new email"
                            placeholderTextColor={theme.colors.textLight}
                            value={confirmEmail}
                            onChangeText={setConfirmEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            editable={!loading}
                            returnKeyType="send"
                            onSubmitEditing={handleChangeEmail}
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
                        onPress={handleChangeEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.white} />
                        ) : (
                            <View style={styles.buttonInner}>
                                <Text style={styles.primaryButtonText}>
                                    Send Confirmation Emails
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

                <View style={styles.noticeBox}>
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={theme.colors.primary}
                    />

                    <Text style={styles.noticeText}>
                        Your email will not change until the required
                        confirmation steps have been completed.
                    </Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    readOnlyWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        minHeight: 48,
        opacity: 0.75,
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
    readOnlyText: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.textSubtle,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.dangerLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
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
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    noticeText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        flex: 1,
        lineHeight: 20,
    },
    emailSummary: {
        width: '100%',
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadow.small,
    },
    summaryLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        marginBottom: theme.spacing.xs,
    },
    summaryValue: {
        ...theme.typography.body,
        color: theme.colors.textDark,
        fontWeight: '600',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
});