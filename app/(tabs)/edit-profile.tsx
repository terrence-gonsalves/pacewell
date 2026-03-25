import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ActivityLevel, UserProfile } from '../../types/health';

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

export default function EditProfile() {
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setFullName(data.full_name);
            setAge(String(data.age));
            setActivityLevel(data.activity_level);
            setSelectedGoals(data.health_goals ?? []);
        }

        setIsLoading(false);
    };

    const toggleGoal = (goal: string) => {
        setSelectedGoals(prev =>
            prev.includes(goal)
                ? prev.filter(g => g !== goal)
                : [...prev, goal]
        );
    };

    const handleSave = async () => {
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

        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    age: Number(age),
                    activity_level: activityLevel,
                    primary_activity: activityLevel,
                    health_goals: selectedGoals,
                })
                .eq('id', user.id);

            if (error) {
                setError(error.message);

                return;
            }

            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centred}>
                <ActivityIndicator size="large" color="#2d6a4f" />
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
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 60 }} />
                </View>
                
                <Text style={styles.inputLabel}>Full name</Text>
                <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your name"
                    placeholderTextColor="#999"
                    autoComplete="name"
                />
                
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="Your age"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                />
                
                <Text style={styles.inputLabel}>Activity level</Text>

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
                
                <Text style={styles.inputLabel}>Health goals</Text>
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
                
                {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
                )}
                
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >

                    {isSaving ? (
                    <ActivityIndicator color="#fff" />
                    ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                    
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 48,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    backButton: {
        fontSize: 15,
        color: '#2d6a4f',
        fontWeight: '600',
        width: 60,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 10,
        marginTop: 8,
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
    errorContainer: {
        padding: 12,
        backgroundColor: '#fff0f0',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e63946',
        marginBottom: 12,
    },
    errorText: {
        color: '#e63946',
        fontSize: 13,
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: '#2d6a4f',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});