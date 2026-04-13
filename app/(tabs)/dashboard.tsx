import { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AIInsight, ActivityLog, ActivityType, EmojiScale, EmojiScaleLabels } from '../../types/health';
import { formatDate, parseLocalDate, getLocalDate } from '../../lib/locale';
import { theme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_LABELS: EmojiScaleLabels = {
    1: { emoji: '😞', label: 'Low' },
    2: { emoji: '😕', label: 'Poor' },
    3: { emoji: '😐', label: 'OK' },
    4: { emoji: '😊', label: 'Good' },
    5: { emoji: '😄', label: 'Great' },
};

const ENERGY_LABELS: EmojiScaleLabels = {
    1: { emoji: '🪫', label: 'Drained' },
    2: { emoji: '😪', label: 'Tired' },
    3: { emoji: '😐', label: 'OK' },
    4: { emoji: '⚡', label: 'Good' },
    5: { emoji: '🔥', label: 'Great' },
};

const SLEEP_LABELS: Record<string, string> = {
    poor: 'Poor',
    fair: 'Fair',
    ok: 'OK',
    good: 'Good',
    great: 'Great',
};

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

const DEFAULT_FORM = {
    activityType: 'walking' as ActivityType,
    duration: 30,
    perceivedExertion: 3 as EmojiScale,
    notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';

    return 'Good Evening,';
};

const getSleepLabel = (hours: number): string => {
    if (hours < 5) return 'Poor';
    if (hours < 6) return 'Fair';
    if (hours < 7) return 'OK';
    if (hours < 8) return 'Good';

    return 'Great';
};

const getDescriptiveLabel = (avg: number, labels: EmojiScaleLabels): string => {
    const rounded = Math.max(1, Math.min(5, Math.round(avg))) as EmojiScale;

    return labels[rounded].label;
};

const getEmojiForAverage = (avg: number, labels: EmojiScaleLabels): string => {
    const rounded = Math.max(1, Math.min(5, Math.round(avg))) as EmojiScale;

    return labels[rounded].emoji;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
    firstName: string;
    avatarUrl: string | null;
    hasCheckedInToday: boolean;
    streak: number;
    avgMood: number | null;
    avgEnergy: number | null;
    avgSleepHours: number | null;
    recentActivities: ActivityLog[];
    latestInsight: AIInsight | null;
}

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

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);

    const updateForm = <K extends keyof typeof DEFAULT_FORM>(
        key: K,
        value: (typeof DEFAULT_FORM)[K]
    ) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // ─── load Dashboard ────────────────────────────────────────────────────────────────

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [])
    );

    const loadDashboard = async () => {
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const today = getLocalDate();
            const sevenDaysAgo = getLocalDate(
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            );

            const [
                profileResult,
                todayCheckInResult,
                weekCheckInsResult,
                recentActivitiesResult,
                latestInsightResult,
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', user.id)
                    .single(),
                supabase
                    .from('daily_checkins')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('date', today)
                    .single(),
                supabase
                    .from('daily_checkins')
                    .select('date, mood, energy, sleep_hours')
                    .eq('user_id', user.id)
                    .gte('date', sevenDaysAgo)
                    .order('date', { ascending: false }),
                supabase
                    .from('activity_logs')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('ai_insights')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
            ]);

            const checkIns = weekCheckInsResult.data ?? [];
            const avgMood = checkIns.length
                ? checkIns.reduce((sum, c) => sum + c.mood, 0) / checkIns.length
                : null;
            const avgEnergy = checkIns.length
                ? checkIns.reduce((sum, c) => sum + c.energy, 0) / checkIns.length
                : null;
            const avgSleepHours = checkIns.length
                ? checkIns.reduce((sum, c) => sum + c.sleep_hours, 0) / checkIns.length
                : null;

            const streak = calculateStreak(checkIns.map(c => c.date), today);
            const fullName = profileResult.data?.full_name ?? '';
            const firstName = fullName.split(' ')[0];

            setData({
                firstName,
                avatarUrl: profileResult.data?.avatar_url ?? null,
                hasCheckedInToday: !!todayCheckInResult.data,
                streak,
                avgMood,
                avgEnergy,
                avgSleepHours,
                recentActivities: (recentActivitiesResult.data ?? []) as ActivityLog[],
                latestInsight: latestInsightResult.data ?? null,
            });
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStreak = (dates: string[], today: string): number => {
        if (dates.length === 0) return 0;
      
        const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

        let streakCount = 0;
        let current = new Date(today + 'T12:00:00');
      
        // if today isn't checked in start counting from yesterday
        if (sortedDates[0] !== today) {
            current.setDate(current.getDate() - 1);
        }
      
        for (const date of sortedDates) {
            const expected = getLocalDate(current);

            if (date === expected) {
                streakCount++;
                current.setDate(current.getDate() - 1);
            } else {
                break;
            }
        }
      
        return streakCount;
    };

    const handleActivitySubmit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);

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
                setSubmitError(error.message);
                return;
            }

            setForm(DEFAULT_FORM);

            await loadDashboard();
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getActivityMeta = (type: ActivityType) =>
        ACTIVITY_TYPES.find(a => a.type === type) ?? ACTIVITY_TYPES[8];

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View style={styles.centred}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

  return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerRow}>
                    <View style={styles.brandIcon}>
                        <Ionicons name="flash" size={20} color={theme.colors.white} />
                    </View>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={() => router.push('/(tabs)/profile')}
                    >

                        {data?.avatarUrl ? (
                        <Image
                            source={{ uri: data.avatarUrl }}
                            style={styles.headerAvatarImage}
                        />
                        ) : (
                        <View style={styles.headerAvatar}>
                            <Text style={styles.headerAvatarText}>
                                {data?.firstName?.charAt(0).toUpperCase() ?? '?'}
                            </Text>
                        </View>
                        )}

                        <View style={styles.onlineDot} />
                    </TouchableOpacity>  
                </View>

                <View style={styles.headerDivider} />
                
                <View style={styles.greetingSection}>
                    <Text style={styles.greetingLine1}>{getGreeting()}</Text>
                    <Text style={styles.greetingName}>{data?.firstName}</Text>
                    <Text style={styles.greetingSubtitle}>Ready for a healthy day?</Text>
                </View>
                
                {data?.streak !== undefined && data.streak >= 1 && (
                <View style={styles.streakCard}>
                    <View style={styles.streakLeft}>
                        <Text style={styles.streakLabel}>CURRENT STREAK</Text>
                        <View style={styles.streakCountRow}>
                            <Text style={styles.streakCount}>{data.streak}</Text>
                            <Text style={styles.streakDays}> Days</Text>
                        </View>
                        <Text style={styles.streakMotivation}>
                            You're on a roll — keep it going! 💪
                        </Text>
                    </View>
                    <View style={styles.streakIconContainer}>
                        <Ionicons name="flash" size={28} color={theme.colors.primary} />
                    </View>
                </View>
                )}
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Check-in</Text>

                    {data?.hasCheckedInToday ? (
                    <TouchableOpacity
                        style={styles.checkInComplete}
                        onPress={() => router.push('/(tabs)/checkin')}
                    >
                        <View style={styles.checkInIconContainer}>
                            <Ionicons name="checkmark-circle" size={32} color={theme.colors.primary} />
                        </View>
                        <View style={styles.checkInText}>
                            <Text style={styles.checkInTitle}>All done for today</Text>
                            <Text style={styles.checkInSubtitle}>Tap to review or edit</Text>
                        </View>
                    </TouchableOpacity>
                    ) : (
                    <TouchableOpacity
                        style={styles.checkInPending}
                        onPress={() => router.push('/(tabs)/checkin')}
                    >
                        <View style={styles.checkInIconContainer}>
                            <Ionicons name="time-outline" size={28} color={theme.colors.textSubtle} />
                        </View>
                        <View style={styles.checkInText}>
                            <Text style={styles.checkInPendingTitle}>Today's Check-in</Text>
                            <Text style={styles.checkInSubtitle}>
                                Takes less than 1 minute to complete.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => router.push('/(tabs)/checkin')}
                        >
                            <Text style={styles.startButtonText}>Start</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                    )}

                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Weekly Averages</Text>

                    {data?.avgMood === null ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>
                            Complete a few check-ins to see your averages
                        </Text>
                    </View>
                    ) : (
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>
                                {getEmojiForAverage(data?.avgMood ?? 3, MOOD_LABELS)}
                            </Text>
                            <Text style={styles.statValue}>
                                {getDescriptiveLabel(data?.avgMood ?? 3, MOOD_LABELS)}
                            </Text>
                            <Text style={styles.statLabel}>MOOD</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>
                                {getEmojiForAverage(data?.avgEnergy ?? 3, ENERGY_LABELS)}
                            </Text>
                            <Text style={styles.statValue}>
                                {getDescriptiveLabel(data?.avgEnergy ?? 3, ENERGY_LABELS)}
                            </Text>
                            <Text style={styles.statLabel}>ENERGY</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>😴</Text>
                            <Text style={styles.statValue}>
                                {getSleepLabel(data?.avgSleepHours ?? 7)}
                            </Text>
                            <Text style={styles.statLabel}>SLEEP</Text>
                        </View>
                    </View>
                    )}

                </View>
                
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Latest Insight</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/insights')}>
                            <Text style={styles.seeAllText}>See all →</Text>
                        </TouchableOpacity>
                    </View>

                    {data?.latestInsight ? (
                    <TouchableOpacity
                        style={styles.insightCard}
                        onPress={() => router.push('/(tabs)/insights')}
                    >
                        <View style={styles.insightHeader}>
                            <View style={styles.insightBadge}>
                                <Text style={styles.insightBadgeText}>AI Insight</Text>
                            </View>
                            <Text style={styles.insightDate}>

                                {formatDate(
                                    parseLocalDate(data.latestInsight.created_at.split('T')[0]),
                                    { day: 'numeric', month: 'short' }
                                )}

                            </Text>
                        </View>
                        <Text style={styles.insightContent} numberOfLines={3}>
                            {data.latestInsight.content}
                        </Text>
                        <Text style={styles.learnMore}>Learn more →</Text>
                    </TouchableOpacity>
                    ) : (
                    <TouchableOpacity
                        style={styles.insightEmptyCard}
                        onPress={() => router.push('/(tabs)/insights')}
                    >
                        <Text style={styles.insightEmptyEmoji}>🤖</Text>
                        <Text style={styles.insightEmptyTitle}>No insights yet</Text>
                        <Text style={styles.insightEmptyText}>
                            Complete a few daily check-ins and Pacewell will start generating personalised insights for you.
                        </Text>
                    </TouchableOpacity>
                    )}

                </View>
                
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
                            <Text style={styles.seeAllText}>View All →</Text>
                        </TouchableOpacity>
                    </View>

                    {data?.recentActivities.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>
                            No activities logged yet — tap + to add one
                        </Text>
                    </View>
                    ) : (
                    <View style={styles.card}>

                        {data?.recentActivities.map((activity, index) => {
                            const meta = getActivityMeta(activity.activity_type);

                            return (
                                <View key={activity.id}>
                                    <View style={styles.activityRow}>
                                        <View style={styles.activityIconContainer}>
                                            <Text style={styles.activityEmoji}>{meta.emoji}</Text>
                                        </View>
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityType}>
                                                {meta.label}
                                            </Text>
                                            <Text style={styles.activityMeta}>
                                                {activity.duration_minutes} min
                                            </Text>
                                        </View>
                                        <View style={styles.activityRight}>
                                            <View style={styles.effortBadge}>
                                                <Text style={styles.effortBadgeText}>
                                                    {EXERTION_LABELS[activity.perceived_exertion as EmojiScale].label}
                                                </Text>
                                            </View>
                                            <Text style={styles.activityDate}>

                                                {formatDate(parseLocalDate(activity.date), {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}

                                            </Text>
                                        </View>
                                    </View>

                                    {index < (data?.recentActivities.length ?? 0) - 1 && (
                                    <View style={styles.divider} />
                                    )}
                                    
                                </View>
                            );
                        })}

                    </View>
                    )}

                </View>
            </ScrollView>
            
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push({
                    pathname: '/log-activity',
                    params: { from: 'dashboard' },
                })}
            >
                <Ionicons name="add" size={28} color={theme.colors.white} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    inner: {
        paddingTop: 60,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 100,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    brandIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingSection: {
        marginBottom: theme.spacing.lg,
    },
    greetingLine1: {
        fontSize: 22,
        fontWeight: '400',
        color: theme.colors.textBody,
    },
    greetingName: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    greetingSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
    },
    streakCard: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    streakLeft: {
        flex: 1,
    },
    streakLabel: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    streakCountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    streakCount: {
        fontSize: 36,
        fontWeight: '700',
        color: theme.colors.textDark,
    },
    streakDays: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textDark,
    },
    streakMotivation: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        marginTop: 4,
    },
    streakIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadow.small,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
    },
    seeAllText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    checkInComplete: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    checkInPending: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
    },
    checkInIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkInText: {
        flex: 1,
    },
    checkInTitle: {
        ...theme.typography.cardTitle,
        color: theme.colors.primary,
        marginBottom: 2,
    },
    checkInPendingTitle: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
        marginBottom: 2,
    },
    checkInSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    startButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.md,
    },
    startButtonText: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    statsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
    },
    statEmoji: {
        fontSize: 28,
        marginBottom: 6,
    },
    statValue: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    statLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        letterSpacing: 0.6,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadow.small,
    },
    emptyCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    emptyText: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        lineHeight: 20,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    activityIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityEmoji: {
        fontSize: 22,
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
    activityRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    effortBadge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    effortBadgeText: {
        ...theme.typography.caption,
        color: theme.colors.textBody,
    },
    activityDate: {
        ...theme.typography.caption,
        color: theme.colors.textLight,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.md,
    },
    insightCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
    },
    insightHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    insightBadge: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    insightBadgeText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    insightDate: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    insightContent: {
        ...theme.typography.body,
        color: theme.colors.textBody,
        lineHeight: 22,
        marginBottom: theme.spacing.sm,
    },
    learnMore: {
        ...theme.typography.label,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    insightEmptyCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    insightEmptyEmoji: {
        fontSize: 40,
        marginBottom: theme.spacing.md,
    },
    insightEmptyTitle: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
    },
    insightEmptyText: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        lineHeight: 20,
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
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textBody,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    activityTypeLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    activityTypeLabelActive: {
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
    avatarContainer: {
        position: 'relative',
        width: 40,
        height: 40,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textDark,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    headerDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    headerAvatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
});