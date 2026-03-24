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
import { supabase } from '../../lib/supabase';
import { ActivityLevel } from '../../types/health';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
    { value: 'light', label: '🚶 Light', description: 'Walking, gentle stretching' },
    { value: 'moderate', label: '🚴 Moderate', description: 'Cycling, swimming, hiking' },
    { value: 'active', label: '🏃 Active', description: 'Running, tennis, regular gym' },
    { value: 'athlete', label: '🏅 Athlete', description: 'Competitive or high intensity' },
];

const HEALTH_GOALS = [
    'Prevent injury',
    'Improve sleep',
    'Manage stress',
    'Increase energy',
    'Stay active longer',
    'Monitor recovery',
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Register() {

    // step tracking
    const [step, setStep] = useState<1 | 2>(1);

    // step 1 fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // step 2 fields
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

    // ui state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Step 1 Validation ──────────────────────────────────────────────────

    const handleStepOne = () => {
        setError(null);

        if (!email || !password || !confirmPassword) {
            setError('Please fill in all fields.');

            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');

            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');

            return;
        }

        setStep(2);
    };

    // ─── Goal Toggle ────────────────────────────────────────────────────────

    const toggleGoal = (goal: string) => {
        setSelectedGoals(prev =>
            prev.includes(goal)
                ? prev.filter(g => g !== goal)
                : [...prev, goal]
        );
    };

    // ─── Final Submission ───────────────────────────────────────────────────

    const handleSubmit = async () => {
        setError(null);

        if (!fullName) {
            setError('Please enter your name.');

            return;
        }

        if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 120) {
            setError('Please enter a valid age.');

            return;
        }

        if (!activityLevel) {
            setError('Please select your activity level.');

            return;
        }

        if (selectedGoals.length === 0) {
            setError('Please select at least one health goal.');

            return;
        }

        setLoading(true);

        // step 1: Create the auth account
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });       
  
        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);

            return;
        }
  
        if (!data.user) {
            setError('Something went wrong. Please try again.');
            setLoading(false);

            return;
        }
  
        // step 2: Wait for session to be fully established
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {

            // session not ready yet — profile will be created after email confirmation
            setError('Please check your email to confirm your account, then sign in.');
            setLoading(false);

            return;
        }
  
        // step 3: Create the profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                full_name: fullName,
                age: Number(age),
                primary_activity: activityLevel,
                activity_level: activityLevel,
                health_goals: selectedGoals,
            });
        
        if (profileError) {
            setError(profileError.message);
            setLoading(false);
            
            return;
        }
        
        setLoading(false);
    };

    // ─── Render Step 1 ──────────────────────────────────────────────────────

    const renderStepOne = () => (
        <>
            <Text style={styles.stepLabel}>Step 1 of 2</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start tracking your recovery today</Text>

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
            <TextInput
                style={styles.input}
                placeholder="Password (min. 8 characters)"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleStepOne}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.registerLink}
                onPress={() => router.back()}
            >
                <Text style={styles.registerText}>
                    Already have an account?{' '}
                    <Text style={styles.registerTextBold}>Sign in</Text>
                </Text>
            </TouchableOpacity>
        </>
    );

    // ─── Render Step 2 ──────────────────────────────────────────────────────

    const renderStepTwo = () => (
        <>
            <Text style={styles.stepLabel}>Step 2 of 2</Text>
            <Text style={styles.title}>Your profile</Text>
            <Text style={styles.subtitle}>Help us personalise your insights</Text>

            <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
            />
            <TextInput
                style={styles.input}
                placeholder="Age"
                placeholderTextColor="#999"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
            />
            
            <Text style={styles.sectionLabel}>Activity level</Text>

            {ACTIVITY_LEVELS.map(level => (
            <TouchableOpacity
                key={level.value}
                style={[
                    styles.optionCard,
                    activityLevel === level.value && styles.optionCardActive,
                ]}
                onPress={() => setActivityLevel(level.value)}
                >
                <Text style={styles.optionLabel}>{level.label}</Text>
                <Text style={styles.optionDescription}>{level.description}</Text>
            </TouchableOpacity>
            ))}
            
            <Text style={styles.sectionLabel}>Health goals</Text>
            <View style={styles.goalsGrid}>

                {HEALTH_GOALS.map(goal => (
                <TouchableOpacity
                    key={goal}
                    style={[
                        styles.goalChip,
                        selectedGoals.includes(goal) && styles.goalChipActive,
                    ]}
                    onPress={() => toggleGoal(goal)}
                >
                    <Text style={[
                        styles.goalChipText,
                        selectedGoals.includes(goal) && styles.goalChipTextActive,
                    ]}>
                        {goal}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
            >

                {loading ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={styles.buttonText}>Create Account</Text>
                )}

            </TouchableOpacity>

            <TouchableOpacity
                style={styles.registerLink}
                onPress={() => { setStep(1); setError(null); }}
            >
                <Text style={styles.registerText}>
                    <Text style={styles.registerTextBold}>← Back</Text>
                </Text>
            </TouchableOpacity>
        </>
    );

    // ─── Main Render ────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.inner}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {step === 1 ? renderStepOne() : renderStepTwo()}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    inner: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 48,
    },
    stepLabel: {
        fontSize: 13,
        color: '#2d6a4f',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
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
    sectionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
        marginTop: 8,
        marginBottom: 12,
    },
    optionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    optionCardActive: {
        borderColor: '#2d6a4f',
        backgroundColor: '#f0faf4',
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 2,
    },
    optionDescription: {
        fontSize: 13,
        color: '#888',
    },
    goalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    goalChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
    },
    goalChipActive: {
        backgroundColor: '#2d6a4f',
        borderColor: '#2d6a4f',
    },
    goalChipText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    goalChipTextActive: {
        color: '#fff',
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
});