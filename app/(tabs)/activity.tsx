import { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Animated,
    Pressable,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ActivityLog, ActivityType, EmojiScale, EmojiScaleLabels } from '../../types/health';
import { formatDate, parseLocalDate, getLocalDate } from '../../lib/locale';
import { theme } from '../../lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const DEFAULT_WEEKLY_TARGET = 5; // placeholder — will be user-configurable
const WEEKLY_GOAL_KEY = 'pacewell_weekly_goal';

const DEFAULT_FORM = {
    activityType: 'walking' as ActivityType,
    duration: 30,
    perceivedExertion: 3 as EmojiScale,
    notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDateLabel = (dateStr: string): string => {
    const today = getLocalDate();
    const yesterday = getLocalDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    if (dateStr === today) return 'TODAY';
    if (dateStr === yesterday) return 'YESTERDAY';

    return formatDate(parseLocalDate(dateStr), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).toUpperCase();
};

const getWeekStart = (): string => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);

    return getLocalDate(new Date(now.setDate(diff)));
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

export default function Activity() {
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [weeklyCount, setWeeklyCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [weeklyTarget, setWeeklyTarget] = useState(5);

    const updateForm = <K extends keyof typeof DEFAULT_FORM>(
        key: K,
        value: (typeof DEFAULT_FORM)[K]
    ) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // ─── Load Activities ──────────────────────────────────────────────────────

    useFocusEffect(
        useCallback(() => {
            loadActivities();
        }, [])
    );

    const loadActivities = async () => {
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const today = getLocalDate();
        const weekStart = getWeekStart();
        const storedGoal = await AsyncStorage.getItem(WEEKLY_GOAL_KEY);

        if (storedGoal) setWeeklyTarget(Number(storedGoal));

        const [todayResult, weekResult] = await Promise.all([
            supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .order('created_at', { ascending: false }),
            supabase
                .from('activity_logs')
                .select('id')
                .eq('user_id', user.id)
                .gte('date', weekStart),
        ]);

        setActivities((todayResult.data ?? []) as ActivityLog[]);
        setWeeklyCount(weekResult.data?.length ?? 0);
        setIsLoading(false);
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const today = getLocalDate();

            const { error } = await supabase.from('activity_logs').insert({
                user_id: user.id,
                date: today,
                activity_type: form.activityType,
                duration_minutes: form.duration,
                perceived_exertion: form.perceivedExertion,
                notes: form.notes || null,
                source: 'manual',
            });

            if (error) {
                setError(error.message);

                return;
            }

            setForm(DEFAULT_FORM);
            setSheetVisible(false);

            await loadActivities();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────────────

    const handleDelete = async (id: string) => {
        setIsDeleting(id);

        await supabase.from('activity_logs').delete().eq('id', id);
        await loadActivities();

        setIsDeleting(null);
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getActivityMeta = (type: ActivityType) =>
        ACTIVITY_TYPES.find(a => a.type === type) ?? ACTIVITY_TYPES[8];

    const progressPercent = Math.min(
        (weeklyCount / weeklyTarget) * 100,
        100
    );

    const today = formatDate(new Date(), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Activity Log</Text>
                <Text style={styles.headerSubtitle}>{today}</Text>
            </View>
            <View style={styles.headerDivider} />

            {isLoading ? (
            <View style={styles.centred}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
            ) : (
            <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.dateLabel}>{getDateLabel(getLocalDate())}</Text>

                {activities.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyEmoji}>🏃</Text>
                    <Text style={styles.emptyTitle}>No activities yet today</Text>
                    <Text style={styles.emptySubtitle}>
                        Tap the + button to log your first activity
                    </Text>
                </View>
                ) : (
                <View style={styles.activitiesCard}>

                    {activities.map((activity, index) => {
                        const meta = getActivityMeta(activity.activity_type);
                        const time = new Date(activity.created_at).toLocaleTimeString(
                            [], { hour: '2-digit', minute: '2-digit' }
                        );

                        return (
                            <View key={activity.id}>
                                <View style={styles.activityRow}>
                                    <View style={styles.activityIconContainer}>
                                        <Text style={styles.activityEmoji}>{meta.emoji}</Text>
                                    </View>
                                    <View style={styles.activityInfo}>
                                        <Text style={styles.activityType}>{meta.label}</Text>
                                        <Text style={styles.activityMeta}>
                                            {activity.duration_minutes} min · {time}
                                        </Text>

                                        {activity.notes && (
                                        <Text style={styles.activityNotes}>{activity.notes}</Text>
                                        )}

                                    </View>
                                    <View style={styles.activityRight}>
                                        <View style={[
                                            styles.effortBadge,
                                            activity.perceived_exertion >= 4 && styles.effortBadgeHigh,
                                        ]}>
                                            <Text style={[
                                                styles.effortBadgeText,
                                                activity.perceived_exertion >= 4 && styles.effortBadgeTextHigh,
                                            ]}>
                                                {EXERTION_LABELS[activity.perceived_exertion as EmojiScale].label}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDelete(activity.id)}
                                            disabled={isDeleting === activity.id}
                                        >

                                            {isDeleting === activity.id ? (
                                            <ActivityIndicator size="small" color={theme.colors.danger} />
                                            ) : (
                                            <Ionicons
                                                name="close-circle-outline"
                                                size={20}
                                                color={theme.colors.textLight}
                                            />
                                            )}

                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {index < activities.length - 1 && (
                                <View style={styles.divider} />
                                )}

                            </View>
                        );
                    })}

                </View>
                )}
                
                <View style={styles.weeklyGoalCard}>
                    <View style={styles.weeklyGoalHeader}>
                        <View style={styles.weeklyGoalLeft}>
                            <Ionicons name="flame" size={20} color={theme.colors.primary} />
                            <Text style={styles.weeklyGoalTitle}>Weekly Goal</Text>
                        </View>
                        <Text style={styles.weeklyGoalCount}>
                            {weeklyCount} of {weeklyTarget} activities
                        </Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                            styles.progressFill,
                            { width: `${progressPercent}%` },
                            ]}
                        />
                    </View>
                </View>

                </ScrollView>
            )}
            
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                setError(null);
                setSheetVisible(true);
                }}
            >
                <Ionicons name="add" size={28} color={theme.colors.white} />
            </TouchableOpacity>
            
            <Modal
                visible={sheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSheetVisible(false)}
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setSheetVisible(false)}
                />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.sheetWrapper}
                    >
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.sheetTitle}>Log Activity</Text>
                            
                            <Text style={styles.inputLabel}>Activity type</Text>
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
                                        form.activityType === type && styles.activityTypeButtonActive,
                                    ]}
                                    onPress={() => updateForm('activityType', type)}
                                >
                                    <Text style={styles.activityTypeEmoji}>{emoji}</Text>
                                    <Text style={[
                                        styles.activityTypeLabel,
                                        form.activityType === type && styles.activityTypeLabelActive,
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                                ))}

                            </ScrollView>
                            
                            <Text style={styles.inputLabel}>Duration</Text>
                            <Stepper
                                value={form.duration}
                                onChange={val => updateForm('duration', val)}
                                min={5}
                                max={300}
                                step={1}
                                unit="minutes"
                            />
                            
                            <Text style={styles.inputLabel}>Effort level</Text>
                            <EmojiSelector
                                value={form.perceivedExertion}
                                onChange={val => updateForm('perceivedExertion', val)}
                                labels={EXERTION_LABELS}
                            />
                            
                            <Text style={styles.inputLabel}>Notes (optional)</Text>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="How did it feel?"
                                placeholderTextColor={theme.colors.textLight}
                                value={form.notes}
                                onChangeText={val => updateForm('notes', val)}
                                multiline
                                numberOfLines={3}
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
                                    <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
                                </View>
                                )}
                                
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 60,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.screenTitle,
        color: theme.colors.textDark,
    },
    headerSubtitle: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        marginTop: 2,
    },
    headerDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 100,
    },
    dateLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: theme.spacing.sm,
    },
    emptyCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    emptyEmoji: {
        fontSize: 40,
        marginBottom: theme.spacing.md,
    },
    emptyTitle: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        textAlign: 'center',
    },
    activitiesCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        marginBottom: theme.spacing.lg,
        ...theme.shadow.small,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    activityIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityEmoji: {
        fontSize: 24,
    },
    activityInfo: {
        flex: 1,
    },
    activityType: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
        marginBottom: 2,
    },
    activityMeta: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    activityNotes: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        fontStyle: 'italic',
        marginTop: 2,
    },
    activityRight: {
        alignItems: 'flex-end',
        gap: theme.spacing.xs,
    },
    effortBadge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    effortBadgeHigh: {
        backgroundColor: theme.colors.dangerLight,
        borderColor: theme.colors.danger,
    },
    effortBadgeText: {
        ...theme.typography.caption,
        color: theme.colors.textBody,
    },
    effortBadgeTextHigh: {
        color: theme.colors.danger,
    },
    deleteButton: {
        padding: 4,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.md,
    },
    weeklyGoalCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
    },
    weeklyGoalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    weeklyGoalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    weeklyGoalTitle: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
    },
    weeklyGoalCount: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
    },
    progressTrack: {
        height: 8,
        backgroundColor: theme.colors.border,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing.sm,
    },
    progressFill: {
        height: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 4,
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: theme.spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadow.medium,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheet: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        maxHeight: '90%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: theme.spacing.lg,
    },
    sheetTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textBody,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    activityTypeRow: {
        gap: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
    },
    activityTypeButton: {
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        minWidth: 72,
    },
    activityTypeButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    activityTypeEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    activityTypeLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    activityTypeLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    emojiRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: theme.spacing.sm,
    },
    emojiButton: {
        flex: 1,
        alignItems: 'center',
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
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
    },
    emojiLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    stepperButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperButtonDisabled: {
        backgroundColor: theme.colors.border,
    },
    stepperButtonText: {
        fontSize: 24,
        color: theme.colors.white,
        fontWeight: '300',
    },
    stepperValue: {
        alignItems: 'center',
        minWidth: 80,
    },
    stepperValueText: {
        fontSize: 40,
        fontWeight: '700',
        color: theme.colors.textDark,
    },
    stepperUnit: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    notesInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        fontSize: 15,
        color: theme.colors.textDark,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 80,
        marginBottom: theme.spacing.sm,
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
        marginBottom: theme.spacing.md,
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
});