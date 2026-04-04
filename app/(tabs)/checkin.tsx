import { useRef, useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { EmojiScale, EmojiScaleLabels } from '../../types/health';
import { getLocalDate } from '../../lib/locale';
import { generateInsights } from '../../lib/anthropic';
import { theme } from '../../lib/theme';
import { getSleepData } from '../../lib/health';
import { hasHealthPermissions } from '../../lib/healthPermissions';

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

// ─── Scale Labels ─────────────────────────────────────────────────────────────

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

    useFocusEffect(
        useCallback(() => {
            loadTodayCheckIn();
        }, [])
    );

    const loadTodayCheckIn = async () => {
        setIsLoading(true);
        setSubmitted(false);
        setCurrentIndex(0);
      
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

            // try to pre-populate sleep from wearable
            const hasPermission = await hasHealthPermissions();

            if (hasPermission) {
                const sleepData = await getSleepData();

                if (sleepData) {
                    setState({
                        ...DEFAULT_STATE,
                        sleepHours: sleepData.totalHours,
                        sleepQuality: sleepData.quality,
                    });
                } else {
                    setState(DEFAULT_STATE);
                }
            } else {
                setState(DEFAULT_STATE);
            }
        }
      
        setIsLoading(false);
    };

    const scrollToIndex = (index: number) => {
        flatListRef.current?.scrollToIndex({ index, animated: true });

        setCurrentIndex(index);
    };

    const handleNext = () => {
        if (currentIndex < CARDS.length - 1) scrollToIndex(currentIndex + 1);
    };

    const handleBack = () => {
        if (currentIndex > 0) scrollToIndex(currentIndex - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setSubmitError('No user session found. Please log in again.');

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

                return;
            }

            setSubmitted(true);

            generateInsights().catch(err =>
                console.error('Background insight generation failed:', err)
            );
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Card Definitions ───────────────────────────────────────────────────

    const CARDS = [
        {
            key: 'sleepQuality',
            emoji: '😴',
            question: 'How well did you sleep?',
            subtitle: 'Think about how rested you feel this morning.',
            tip: 'Quality sleep is one of the strongest predictors of recovery and performance.',
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
            subtitle: 'Include any naps or rest periods.',
            tip: 'Adults 50+ typically need 7-9 hours for optimal recovery.',
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
            subtitle: 'Think about your general mood since waking up.',
            tip: 'Mood patterns over time can reveal important recovery signals.',
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
            subtitle: 'How energised do you feel right now?',
            tip: 'Low energy for 3+ consecutive days may signal overtraining.',
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
            subtitle: 'Consider both physical and mental stress.',
            tip: 'High stress slows recovery — even from light physical activity.',
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
        subtitle: 'Think about the quality of your meals so far.',
        tip: 'Good nutrition accelerates recovery and stabilises energy levels.',
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
            subtitle: 'Each glass is roughly 250ml or 8oz.',
            tip: 'Staying hydrated reduces fatigue and supports joint health.',
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
            subtitle: 'Optional — any symptoms, feelings or observations.',
            tip: 'Notes help the AI identify patterns that numbers alone might miss.',
            input: (
                <TextInput
                    style={styles.notesInput}
                    placeholder="Optional — how are you feeling overall?"
                    placeholderTextColor={theme.colors.textLight}
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
                <View style={styles.successIconContainer}>
                    <Ionicons name="checkmark-circle" size={64} color={theme.colors.primary} />
                </View>
                <Text style={styles.successTitle}>Check-in saved!</Text>
                <Text style={styles.successSubtitle}>
                    Your data helps Pacewell spot patterns and keep you on track.
                </Text>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace('/(tabs)/dashboard')}
                >
                    <View style={styles.buttonInner}>
                        <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
                        <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
                    </View>
                </TouchableOpacity>
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
                <ActivityIndicator size="large" color={theme.colors.primary} />
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
                <TouchableOpacity
                    onPress={() => router.replace('/(tabs)/dashboard')}
                    style={styles.closeButton}
                >
                    <Ionicons name="close" size={24} color={theme.colors.textDark} />
                </TouchableOpacity>
            </View>
            
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${((currentIndex + 1) / CARDS.length) * 100}%` },
                        ]}
                    />
                </View>
                <Text style={styles.progressLabel}>
                    CHECK-IN PROGRESS — {currentIndex + 1} of {CARDS.length}
                </Text>
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
                    <View style={styles.cardWrapper}>
                        <View style={styles.card}>
                            <Text style={styles.cardEmoji}>{item.emoji}</Text>
                            <Text style={styles.cardQuestion}>{item.question}</Text>
                            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                            {item.input}
                        </View>
                        
                        <View style={styles.tipCard}>
                            <Ionicons
                                name="information-circle-outline"
                                size={16}
                                color={theme.colors.primary}
                            />
                            <Text style={styles.tipText}>{item.tip}</Text>
                        </View>
                    </View>
                )}
            />
            
            {submitError && (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                    <Text style={styles.errorText}>{submitError}</Text>
                </View>
            )}
            
            <View style={styles.navigation}>
                <TouchableOpacity
                    style={[
                        styles.navButton,
                        currentIndex === 0 && styles.navButtonDisabled,
                    ]}
                    onPress={handleBack}
                    disabled={currentIndex === 0}
                >
                    <Ionicons
                        name="arrow-back"
                        size={18}
                        color={currentIndex === 0 ? theme.colors.textLight : theme.colors.primary}
                    />
                    <Text style={[
                        styles.navButtonText,
                        currentIndex === 0 && styles.navButtonTextDisabled,
                    ]}>
                        Back
                    </Text>
                </TouchableOpacity>

                {currentIndex < CARDS.length - 1 ? (
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
                </TouchableOpacity>
                ) : (
                <TouchableOpacity
                    style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color={theme.colors.white} />
                    ) : (
                    <View style={styles.buttonInner}>
                        <Text style={styles.nextButtonText}>
                            {existingId ? 'Update' : 'Submit'}
                        </Text>
                    </View>
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
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 60,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    progressContainer: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    progressTrack: {
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        marginBottom: theme.spacing.xs,
        overflow: 'hidden',
    },
    progressBar: {
        height: 6,
        backgroundColor: theme.colors.primary,
        borderRadius: 3,
    },
    progressLabel: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    cardWrapper: {
        width: SCREEN_WIDTH,
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
        marginBottom: theme.spacing.md,
    },
    cardEmoji: {
        fontSize: 56,
        marginBottom: theme.spacing.md,
    },
    cardQuestion: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textDark,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
        lineHeight: 30,
    },
    cardSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        lineHeight: 22,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    tipText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        flex: 1,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    emojiRow: {
        flexDirection: 'row',
        gap: 6,
        width: '100%',
    },
    emojiButton: {
        flex: 1,
        alignItems: 'center',
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    emojiButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    emojiText: {
        fontSize: 22,
        marginBottom: 2,
    },
    emojiLabel: {
        fontSize: 8,
        color: theme.colors.textSubtle,
        fontWeight: '500',
        textAlign: 'center',
        flexWrap: 'wrap',
    },
    emojiLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xl,
    },
    stepperButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperButtonDisabled: {
        backgroundColor: theme.colors.border,
    },
    stepperButtonText: {
        fontSize: 28,
        color: theme.colors.white,
        fontWeight: '300',
    },
    stepperValue: {
        alignItems: 'center',
        minWidth: 80,
    },
    stepperValueText: {
        fontSize: 44,
        fontWeight: '700',
        color: theme.colors.textDark,
    },
    stepperUnit: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
    },
    notesInput: {
        width: '100%',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        fontSize: 15,
        color: theme.colors.textDark,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 120,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.dangerLight,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
    },
    errorText: {
        ...theme.typography.label,
        color: theme.colors.danger,
        flex: 1,
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 32,
        paddingTop: theme.spacing.md,
        gap: theme.spacing.md,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
    navButtonDisabled: {
        borderColor: theme.colors.border,
    },
    navButtonText: {
        fontSize: 15,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    navButtonTextDisabled: {
        color: theme.colors.textLight,
    },
    nextButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        ...theme.shadow.small,
    },
    nextButtonText: {
        fontSize: 15,
        color: theme.colors.white,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        paddingHorizontal: theme.spacing.xl,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadow.small,
    },
    primaryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    editButton: {
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
    },
    editButtonText: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: theme.colors.background,
    },
    successIconContainer: {
        marginBottom: theme.spacing.lg,
    },
    successTitle: {
        ...theme.typography.screenTitle,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
    },
    successSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
    },
});