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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            setError('Please enter and confirm your new password.');

            return;
        }

        if (password.length < 8) {
            setError('Your password must be at least 8 characters.');

            return;
        }

        if (password !== confirmPassword) {
            setError('The passwords do not match.');

            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);

            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    if (success) {
        return (
            <View style={styles.container}>
                <View style={styles.centred}>
                    <View style={styles.brandIcon}>
                        <Ionicons
                            name="checkmark"
                            size={36}
                            color={theme.colors.white}
                        />
                    </View>

                    <Text style={styles.title}>Password updated</Text>

                    <Text style={styles.subtitle}>
                        Your Pacewell password has been updated successfully.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={async () => {
                            await supabase.auth.signOut();
                            router.replace('/(auth)/login');
                        }}
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
                        <Ionicons
                            name="lock-closed"
                            size={32}
                            color={theme.colors.white}
                        />
                    </View>
                </View>

                <Text style={styles.title}>Create a new password</Text>

                <Text style={styles.subtitle}>
                    Enter a new password for your Pacewell account.
                </Text>

                <View style={styles.formCard}>
                    <Text style={styles.inputLabel}>New Password</Text>

                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="lock-closed-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Enter your new password"
                            placeholderTextColor={theme.colors.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
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

                    <Text style={styles.inputLabel}>Confirm New Password</Text>

                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="lock-closed-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Confirm your new password"
                            placeholderTextColor={theme.colors.textLight}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
                        />

                        <TouchableOpacity
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={styles.inputIconRight}
                        >
                            <Ionicons
                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={18}
                                color={theme.colors.textSubtle}
                            />
                        </TouchableOpacity>
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
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.white} />
                        ) : (
                            <View style={styles.buttonInner}>
                                <Text style={styles.primaryButtonText}>
                                    Update Password
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

                    <Text style={styles.secureText}>SECURE PASSWORD RESET</Text>
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