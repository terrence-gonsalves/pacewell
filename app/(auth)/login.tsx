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
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

type AuthMode = 'password' | 'magic-link';

export default function Login() {
    const [mode, setMode] = useState<AuthMode>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const handlePasswordLogin = async () => {
        if (!email || !password) {
            setError('Please enter your email and password.');

            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }

        // no need to navigate here — the onAuthStateChange listener
        // in _layout.tsx will detect the new session and navigate automatically

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
            options: {
                emailRedirectTo: 'pacewell://auth/callback',
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMagicLinkSent(true);
        }

        setLoading(false);
    };

    const handleSubmit = () => {
        if (mode === 'password') {
            handlePasswordLogin();
        } else {
            handleMagicLink();
        }
    };

    if (magicLinkSent) {
        return (
            <View style={styles.container}>
                <View style={styles.confirmationBox}>
                    <Text style={styles.confirmationEmoji}>📬</Text>
                    <Text style={styles.confirmationTitle}>Check your inbox</Text>
                    <Text style={styles.confirmationText}>
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
            <View style={styles.inner}>
                <Text style={styles.title}>Pacewell</Text>
                <Text style={styles.subtitle}>Your recovery starts here</Text>
                
                <View style={styles.toggle}>
                    <TouchableOpacity
                        style={[styles.toggleButton, mode === 'password' && styles.toggleButtonActive]}
                        onPress={() => { setMode('password'); setError(null); }}
                    >
                        <Text style={[styles.toggleText, mode === 'password' && styles.toggleTextActive]}>
                            Password
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, mode === 'magic-link' && styles.toggleButtonActive]}
                        onPress={() => { setMode('magic-link'); setError(null); }}
                    >
                        <Text style={[styles.toggleText, mode === 'magic-link' && styles.toggleTextActive]}>
                            Magic Link
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                />
                
                {mode === 'password' && (
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                />
                )}
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >

                    {loading ? (
                    <ActivityIndicator color="#fff" />
                    ) : (
                    <Text style={styles.buttonText}>
                        {mode === 'password' ? 'Sign In' : 'Send Magic Link'}
                    </Text>
                    )}

                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => router.push('/(auth)/register')}
                >
                    <Text style={styles.registerText}>
                        Don't have an account?{' '}
                        <Text style={styles.registerTextBold}>Create one</Text>
                    </Text>
                </TouchableOpacity>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 36,
    },
    toggle: {
        flexDirection: 'row',
        backgroundColor: '#e9ecef',
        borderRadius: 10,
        padding: 4,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    toggleTextActive: {
        color: '#1a1a2e',
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1a1a2e',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    errorText: {
        color: '#e63946',
        fontSize: 14,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    button: {
        backgroundColor: '#2d6a4f',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        marginTop: 20,
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#2d6a4f',
        fontSize: 15,
        fontWeight: '500',
    },
    registerLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    registerText: {
        fontSize: 14,
        color: '#888',
    },
    registerTextBold: {
        color: '#2d6a4f',
        fontWeight: '600',
    },
    confirmationBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    confirmationEmoji: {
        fontSize: 56,
        marginBottom: 20,
    },
    confirmationTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 12,
    },
    confirmationText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },    
});