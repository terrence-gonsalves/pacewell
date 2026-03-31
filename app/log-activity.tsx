import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { ActivityType, EmojiScale, EmojiScaleLabels } from '../types/health';
import { getLocalDate } from '../lib/locale';
import { theme } from '../lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: { type: ActivityType; emoji: string; label: string }[] = [
    { type: 'running', emoji: '🏃', label: 'Running' },
    { type: 'cycling', emoji: '🚴', label: 'Cycling' },
    { type: 'swimming', emoji: '🏊', label: 'Swimming' },
    { type: 'walking', emoji: '🚶', label: 'Walking' },
    { type: 'strength', emoji: '🏋️', label: 'Strength' },
    { type: 'yoga', emoji: '🧘', label: 'Yoga' },
    { type: 'tennis', emoji: '🎾', label: 'Tennis' },
    { type: 'golf', emoji: '⛳', label: 'Golf' },
    { type: 'other', emoji: '⚡', label: 'Other' },
];

const EXERTION_LABELS: EmojiScaleLabels = {
    1: { emoji: '🌿', label: 'Easy' },
    2: { emoji: '😊', label: 'Light' },
    3: { emoji: '😤', label: 'Moderate' },
    4: { emoji: '🔥', label: 'Hard' },
    5: { emoji: '💀', label: 'Max' },
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

export default function LogActivity() {
    const { from } = useLocalSearchParams<{ from?: string }>();

    const [activityType, setActivityType] = useState<ActivityType>('walking');
    const [duration, setDuration] = useState(30);
    const [perceivedExertion, setPerceivedExertion] = useState<EmojiScale>(3);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => {
        if (from === 'dashboard') {
            router.replace('/(tabs)/dashboard');
        } else {
            router.replace('/(tabs)/activity');
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setError('No user session found. Please log in again.');

                return;
            }

            const today = getLocalDate();

            const { error } = await supabase.from('activity_logs').insert({
                user_id: user.id,
                date: today,
                activity_type: activityType,
                duration_minutes: duration,
                perceived_exertion: perceivedExertion,
                notes: notes || null,
                source: 'manual',
            });

            if (error) {
                setError(error.message);

                return;
            }

            handleBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Log Activity</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={styles.headerDivider} />

            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.sectionLabel}>ACTIVITY TYPE</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.activityTypeRow}
                >

                    {ACTIVITY_TYPES.map(({ type, emoji, label }) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.activityTypeButton,
                            activityType === type && styles.activityTypeButtonActive,
                        ]}
                        onPress={() => setActivityType(type)}
                    >
                        <View style={[
                            styles.activityTypeIconContainer,
                            activityType === type && styles.activityTypeIconContainerActive,
                        ]}>
                            <Text style={styles.activityTypeEmoji}>{emoji}</Text>
                        </View>
                        <Text style={[
                            styles.activityTypeLabel,
                            activityType === type && styles.activityTypeLabelActive,
                        ]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                    ))}

                </ScrollView>
                
                <Text style={styles.sectionLabel}>DURATION</Text>
                <View style={styles.card}>
                    <Stepper
                        value={duration}
                        onChange={setDuration}
                        min={5}
                        max={300}
                        step={1}
                        unit="minutes"
                    />
                </View>
                
                <Text style={styles.sectionLabel}>EFFORT LEVEL</Text>
                <View style={styles.card}>
                    <EmojiSelector
                        value={perceivedExertion}
                        onChange={setPerceivedExertion}
                        labels={EXERTION_LABELS}
                    />
                </View>
                
                <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
                    <TextInput
                    style={styles.notesInput}
                    placeholder="How did it feel? Any observations?"
                    placeholderTextColor={theme.colors.textLight}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />
                
                {error && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
                )}
                
                <TouchableOpacity
                    style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >

                    {isSubmitting ? (
                    <ActivityIndicator color={theme.colors.white} />
                    ) : (
                    <View style={styles.buttonInner}>
                        <Text style={styles.primaryButtonText}>Log Activity</Text>
                        <Ionicons name="checkmark" size={18} color={theme.colors.white} />
                    </View>
                    )}

                </TouchableOpacity>
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 60,
        paddingBottom: theme.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
    },
    headerDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    inner: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    sectionLabel: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    activityTypeRow: {
        gap: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
    },
    activityTypeButton: {
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    activityTypeIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    activityTypeIconContainerActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    activityTypeEmoji: {
        fontSize: 30,
    },
    activityTypeLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        fontWeight: '500',
    },
    activityTypeLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
        ...theme.shadow.small,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
    },
    stepperButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
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
        minWidth: 100,
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
    emojiRow: {
        flexDirection: 'row',
        gap: 6,
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
        fontSize: 24,
        marginBottom: 4,
    },
    emojiLabel: {
        fontSize: 9,
        color: theme.colors.textSubtle,
        fontWeight: '500',
        textAlign: 'center',
    },
    emojiLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    notesInput: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        fontSize: 15,
        color: theme.colors.textDark,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 120,
        marginBottom: theme.spacing.sm,
        ...theme.shadow.small,
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
    activityTypeButtonActive: {
        borderColor: '#2d6a4f',
        backgroundColor: '#f0faf4',
    },
});