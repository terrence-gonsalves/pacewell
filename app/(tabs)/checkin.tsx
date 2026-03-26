import { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { EmojiScale, EmojiScaleLabels } from '../../types/health';
import { getLocalDate } from '../../lib/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckInState {
    sleepQuality: EmojiScale;
    sleepHours: number;
    mood: EmojiScale;
    energy: EmojiScale;
    stress: EmojiScale;
    nutritionQuality: EmojiScale;
    waterIntake: number;
    notes: string;
}

const DEFAULT_STATE: CheckInState = {
    sleepQuality: 3,
    sleepHours: 7,
    mood: 3,
    energy: 3,
    stress: 3,
    nutritionQuality: 3,
    waterIntake: 6,
    notes: '',
};

// ─── Sub Components ───────────────────────────────────────────────────────────

const EmojiSelector = ({
    value,
    onChange,
    labels,
}: {
    value: EmojiScale;
    onChange: (val: EmojiScale) => void;
    labels: EmojiScaleLabels;
}) => (
    <View style={styles.emojiRow}>

        {([1, 2, 3, 4, 5] as EmojiScale[]).map(scale => (
        <TouchableOpacity
            key={scale}
            style={[styles.emojiButton, value === scale && styles.emojiButtonActive]}
            onPress={() => onChange(scale)}
        >
            <Text style={styles.emojiText}>{labels[scale].emoji}</Text>
            <Text style={[styles.emojiLabel, value === scale && styles.emojiLabelActive]}>
                {labels[scale].label}
            </Text>
        </TouchableOpacity>
        ))}

    </View>
);

const Stepper = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    unit,
}: {
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step?: number;
    unit: string;
}) => (
    <View style={styles.stepper}>
        <TouchableOpacity
            style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}
            onPress={() => onChange(Math.max(min, value - step))}
            disabled={value <= min}
        >
            <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>
        <View style={styles.stepperValue}>
            <Text style={styles.stepperValueText}>{value}</Text>
            <Text style={styles.stepperUnit}>{unit}</Text>
        </View>
        <TouchableOpacity
            style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}
            onPress={() => onChange(Math.min(max, value + step))}
            disabled={value >= max}
        >
            <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
    </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckIn() {
    const [state, setState] = useState<CheckInState>(DEFAULT_STATE);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingId, setExistingId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const update = <K extends keyof CheckInState>(key: K, value: CheckInState[K]) => {
            setState(prev => ({ ...prev, [key]: value }));
    };

    // load today's existing check-in when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadTodayCheckIn();
        }, [])
    );

    const loadTodayCheckIn = async () => {
        setIsLoading(true);
        setSubmitted(false);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const today = getLocalDate();

        const { data } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();

        if (data) {
            setExistingId(data.id);
            setState({
                sleepQuality: data.sleep_quality,
                sleepHours: data.sleep_hours,
                mood: data.mood,
                energy: data.energy,
                stress: data.stress,
                nutritionQuality: data.nutrition_quality,
                waterIntake: data.water_intake_glasses,
                notes: data.notes ?? '',
            });
        } else {
            setExistingId(null);
            setState(DEFAULT_STATE);
        }

        setIsLoading(false);
    };

    const scrollToIndex = (index: number) => {
        flatListRef.current?.scrollToIndex({ index, animated: true });

        setCurrentIndex(index);
    };

    const handleNext = () => {
        if (currentIndex < CARDS.length - 1) {
            scrollToIndex(currentIndex + 1);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            scrollToIndex(currentIndex - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            setSubmitError('No user session found. Please log in again.');
            setIsSubmitting(false);

            return;
        }

        const today = getLocalDate();

        const payload = {
            user_id: user.id,
            date: today,
            sleep_quality: state.sleepQuality,
            sleep_hours: state.sleepHours,
            mood: state.mood,
            energy: state.energy,
            stress: state.stress,
            nutrition_quality: state.nutritionQuality,
            water_intake_glasses: state.waterIntake,
            notes: state.notes || null,
        };

        const { error } = existingId
            ? await supabase.from('daily_checkins').update(payload).eq('id', existingId)
            : await supabase.from('daily_checkins').insert(payload);

        if (error) {
            setSubmitError(error.message);
            setIsSubmitting(false);

            return;
        }

        setSubmitted(true);
        setIsSubmitting(false);
    };

    // ─── Custom Labels ───────────────────────────────────────────────────

    const SLEEP_QUALITY_LABELS: EmojiScaleLabels = {
        1: { emoji: '😫', label: 'Terrible' },
        2: { emoji: '😔', label: 'Poor' },
        3: { emoji: '😐', label: 'OK' },
        4: { emoji: '😊', label: 'Good' },
        5: { emoji: '😴', label: 'Great' },
    };
      
    const MOOD_LABELS: EmojiScaleLabels = {
        1: { emoji: '😞', label: 'Low' },
        2: { emoji: '😕', label: 'Meh' },
        3: { emoji: '😐', label: 'OK' },
        4: { emoji: '😊', label: 'Good' },
        5: { emoji: '😄', label: 'Great' },
    };
      
    const ENERGY_LABELS: EmojiScaleLabels = {
        1: { emoji: '🪫', label: 'Drained' },
        2: { emoji: '😪', label: 'Tired' },
        3: { emoji: '😐', label: 'OK' },
        4: { emoji: '⚡', label: 'Energised' },
        5: { emoji: '🔥', label: 'Fired up' },
    };
      
    const STRESS_LABELS: EmojiScaleLabels = {
        1: { emoji: '😌', label: 'Calm' },
        2: { emoji: '🙂', label: 'Mild' },
        3: { emoji: '😤', label: 'Moderate' },
        4: { emoji: '😰', label: 'High' },
        5: { emoji: '🤯', label: 'Overwhelmed' },
    };
      
    const NUTRITION_LABELS: EmojiScaleLabels = {
        1: { emoji: '🍟', label: 'Poor' },
        2: { emoji: '🥪', label: 'Fair' },
        3: { emoji: '🍽️', label: 'OK' },
        4: { emoji: '🥗', label: 'Good' },
        5: { emoji: '🌱', label: 'Excellent' },
    };

    // ─── Card Definitions ───────────────────────────────────────────────────

    const CARDS = [
        {
            key: 'sleepQuality',
            emoji: '😴',
            question: 'How well did you sleep quality?',
            input: (
                <EmojiSelector
                    value={state.sleepQuality}
                    onChange={val => update('sleepQuality', val)}
                    labels={SLEEP_QUALITY_LABELS}
                />
            ),
        },
        {
            key: 'sleepHours',
            emoji: '⏰',
            question: 'How many hours did you sleep?',
            input: (
                <Stepper
                    value={state.sleepHours}
                    onChange={val => update('sleepHours', val)}
                    min={0}
                    max={24}
                    step={0.5}
                    unit="hours"
                />
            ),
        },
        {
            key: 'mood',
            emoji: '😊',
            question: "How's your mood today?",
            input: (
                <EmojiSelector
                    value={state.mood}
                    onChange={val => update('mood', val)}
                    labels={MOOD_LABELS}
                />
            ),
        },
        {
            key: 'energy',
            emoji: '⚡',
            question: 'How are your energy levels?',
            input: (
                <EmojiSelector
                    value={state.energy}
                    onChange={val => update('energy', val)}
                    labels={ENERGY_LABELS}
                />
            ),
        },
        {
            key: 'stress',
            emoji: '🧠',
            question: 'How stressed do you feel?',
            input: (
                <EmojiSelector
                    value={state.stress}
                    onChange={val => update('stress', val)}
                    labels={STRESS_LABELS}
                />
            ),
        },
        {
            key: 'nutritionQuality',
            emoji: '🥗',
            question: 'How well did you eat today?',
            input: (
                <EmojiSelector
                    value={state.nutritionQuality}
                    onChange={val => update('nutritionQuality', val)}
                    labels={NUTRITION_LABELS}
                />
            ),
        },
        {
            key: 'waterIntake',
            emoji: '💧',
            question: 'How many glasses of water?',
            input: (
                <Stepper
                    value={state.waterIntake}
                    onChange={val => update('waterIntake', val)}
                    min={0}
                    max={20}
                    unit="glasses"
                />
            ),
        },
        {
            key: 'notes',
            emoji: '📝',
            question: 'Anything else to note?',
            input: (
                <TextInput
                    style={styles.notesInput}
                    placeholder="Optional — how are you feeling overall?"
                    placeholderTextColor="#999"
                    value={state.notes}
                    onChangeText={val => update('notes', val)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            ),
        },
    ];

    // ─── Submitted State ────────────────────────────────────────────────────

    if (submitted) {
        return (
            <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>✅</Text>
                <Text style={styles.successTitle}>Check-in saved!</Text>
                <Text style={styles.successSubtitle}>
                    Your data helps Pacewell spot patterns and keep you on track.
                </Text>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => { setSubmitted(false); scrollToIndex(0); }}
                >
                    <Text style={styles.editButtonText}>Edit today's check-in</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ─── Loading State ──────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View style={styles.successContainer}>
                <ActivityIndicator size="large" color="#2d6a4f" />
            </View>
        );
    }

    // ─── Main Render ────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {existingId ? 'Edit Check-in' : 'Daily Check-in'}
                </Text>
                <Text style={styles.headerSubtitle}>
                    {currentIndex + 1} of {CARDS.length}
                </Text>
            </View>
            
            <View style={styles.progressContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${((currentIndex + 1) / CARDS.length) * 100}%` },
                    ]}
                />
            </View>
            
            <FlatList
                ref={flatListRef}
                data={CARDS}
                keyExtractor={item => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                onMomentumScrollEnd={e => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(index);
                }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.cardEmoji}>{item.emoji}</Text>
                        <Text style={styles.cardQuestion}>{item.question}</Text>
                        {item.input}
                    </View>
                )}
            />
            
            {submitError && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{submitError}</Text>
                </View>
            )}
            
            <View style={styles.navigation}>
                <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonHidden]}
                    onPress={handleBack}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navButtonText}>← Back</Text>
                </TouchableOpacity>

                {currentIndex < CARDS.length - 1 ? (
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Next →</Text>
                </TouchableOpacity>
                ) : (
                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                    ) : (
                    <Text style={styles.submitButtonText}>
                        {existingId ? 'Update' : 'Submit'}
                    </Text>
                    )}
                </TouchableOpacity>
                )}

            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 24,
        borderRadius: 2,
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#2d6a4f',
        borderRadius: 2,
    },
    card: {
        width: SCREEN_WIDTH,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    cardEmoji: {
        fontSize: 64,
        marginBottom: 24,
    },
    cardQuestion: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1a1a2e',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 34,
    },
    emojiRow: {
        flexDirection: 'row',
        gap: 8,
    },
    emojiButton: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
        minWidth: 56,
    },
    emojiButtonActive: {
        borderColor: '#2d6a4f',
        backgroundColor: '#f0faf4',
    },
    emojiText: {
        fontSize: 28,
        marginBottom: 4,
    },
    emojiLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: '500',
        textAlign: 'center',
    },
    emojiLabelActive: {
        color: '#2d6a4f',
        fontWeight: '700',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    stepperButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2d6a4f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperButtonDisabled: {
        backgroundColor: '#e0e0e0',
    },
    stepperButtonText: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '300',
    },
    stepperValue: {
        alignItems: 'center',
        minWidth: 80,
    },
    stepperValueText: {
        fontSize: 48,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    stepperUnit: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    notesInput: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minHeight: 120,
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 16,
    },
    navButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    navButtonHidden: {
        opacity: 0,
    },
    navButtonText: {
        fontSize: 16,
        color: '#2d6a4f',
        fontWeight: '600',
    },
    nextButton: {
        backgroundColor: '#2d6a4f',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#2d6a4f',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#f8f9fa',
    },
    successEmoji: {
        fontSize: 64,
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 12,
    },
    successSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    editButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#2d6a4f',
    },
    editButtonText: {
        fontSize: 15,
        color: '#2d6a4f',
        fontWeight: '600',
    },

    errorContainer: {
        marginHorizontal: 24,
        marginBottom: 8,
        padding: 12,
        backgroundColor: '#fff0f0',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e63946',
      },
      errorText: {
        color: '#e63946',
        fontSize: 13,
        textAlign: 'center',
      },
});