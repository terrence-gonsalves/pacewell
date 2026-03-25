import { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AIInsight, ActivityLog, EmojiScale, EmojiScaleLabels } from '../../types/health';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const ACTIVITY_EMOJI: Record<string, string> = {
    running: '🏃',
    cycling: '🚴',
    swimming: '🏊',
    walking: '🚶',
    strength: '🏋️',
    yoga: '🧘',
    tennis: '🎾',
    golf: '⛳',
    other: '⚡',
};

const EXERTION_LABELS: EmojiScaleLabels = {
    1: { emoji: '🌿', label: 'Easy' },
    2: { emoji: '😊', label: 'Light' },
    3: { emoji: '😤', label: 'Moderate' },
    4: { emoji: '🔥', label: 'Hard' },
    5: { emoji: '💀', label: 'Max' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';

    return 'Good evening';
};

const getFormattedDate = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

const getEmojiForAverage = (
    avg: number,
    labels: EmojiScaleLabels
): string => {
    const rounded = Math.round(avg) as EmojiScale;
    const clamped = Math.max(1, Math.min(5, rounded)) as EmojiScale;

    return labels[clamped].emoji;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
    firstName: string;
    hasCheckedInToday: boolean;
    streak: number;
    avgMood: number | null;
    avgEnergy: number | null;
    avgSleepHours: number | null;
    recentActivities: ActivityLog[];
    latestInsight: AIInsight | null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

            const today = new Date().toISOString().split('T')[0];
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            // run all queries in parallel
            const [
                profileResult,
                todayCheckInResult,
                weekCheckInsResult,
                recentActivitiesResult,
                latestInsightResult,
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('full_name')
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
                    .limit(3),
                supabase
                    .from('ai_insights')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
            ]);

            // calculate averages from last 7 days
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

            // calculate streak
            const streak = calculateStreak(checkIns.map(c => c.date), today);

            // extract first name
            const fullName = profileResult.data?.full_name ?? '';
            const firstName = fullName.split(' ')[0];

            setData({
                firstName,
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

        const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));
        let streak = 0;
        let current = new Date(today);

        // if today isn't checked in, start counting from yesterday
        if (sortedDates[0] !== today) {
        current.setDate(current.getDate() - 1);
        }

        for (const date of sortedDates) {
        const expected = current.toISOString().split('T')[0];
        if (date === expected) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
        }

        return streak;
    };

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View style={styles.centred}>
                <ActivityIndicator size="large" color="#2d6a4f" />
            </View>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.inner}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.greetingSection}>
                <Text style={styles.greeting}>
                    {getGreeting()}, {data?.firstName} 👋
                </Text>
                <Text style={styles.date}>{getFormattedDate()}</Text>
            </View>
            
            {data?.streak !== undefined && data.streak > 0 && (
            <View style={styles.streakCard}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View>
                    <Text style={styles.streakCount}>{data.streak} day streak</Text>
                    <Text style={styles.streakSubtitle}>Keep it going!</Text>
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
                    <Text style={styles.checkInCompleteEmoji}>✅</Text>
                    <View>
                        <Text style={styles.checkInCompleteTitle}>All done for today</Text>
                        <Text style={styles.checkInCompleteSubtitle}>
                            Tap to review or edit
                        </Text>
                    </View>
                </TouchableOpacity>
                ) : (
                <TouchableOpacity
                    style={styles.checkInPending}
                    onPress={() => router.push('/(tabs)/checkin')}
                >
                    <Text style={styles.checkInPendingEmoji}>⭕</Text>
                    <View style={styles.checkInPendingText}>
                        <Text style={styles.checkInPendingTitle}>
                            Check-in not done yet
                        </Text>
                        <Text style={styles.checkInPendingSubtitle}>
                            Tap to log how you're feeling
                        </Text>
                    </View>
                    <Text style={styles.checkInArrow}>›</Text>
                </TouchableOpacity>
                )}
            </View>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Last 7 Days</Text>

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
                            {data?.avgMood?.toFixed(1)}
                        </Text>
                        <Text style={styles.statLabel}>Mood</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>
                            {getEmojiForAverage(data?.avgEnergy ?? 3, ENERGY_LABELS)}
                        </Text>
                        <Text style={styles.statValue}>
                            {data?.avgEnergy?.toFixed(1)}
                        </Text>
                        <Text style={styles.statLabel}>Energy</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>😴</Text>
                        <Text style={styles.statValue}>
                            {data?.avgSleepHours?.toFixed(1)}h
                        </Text>
                        <Text style={styles.statLabel}>Sleep</Text>
                    </View>
                </View>
                )}

            </View>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>

                {data?.recentActivities.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                        No activities logged yet — head to the Activity tab to add one
                    </Text>
                </View>
                ) : (
                <View style={styles.card}>

                    {data?.recentActivities.map((activity, index) => (
                    <View key={activity.id}>
                        <View style={styles.activityRow}>
                            <Text style={styles.activityEmoji}>
                                {ACTIVITY_EMOJI[activity.activity_type] ?? '⚡'}
                            </Text>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityType}>
                                    {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                </Text>
                                <Text style={styles.activityMeta}>
                                    {activity.duration_minutes} min •{' '}
                                    {EXERTION_LABELS[activity.perceived_exertion as EmojiScale].emoji}{' '}
                                    {EXERTION_LABELS[activity.perceived_exertion as EmojiScale].label}
                                </Text>
                            </View>
                            <Text style={styles.activityDate}>

                                {new Date(activity.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                })}

                            </Text>
                        </View>

                        {index < (data?.recentActivities.length ?? 0) - 1 && (
                        <View style={styles.divider} />
                        )}

                    </View>
                    ))}

                </View>
                )}

            </View>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Latest Insight</Text>

                {data?.latestInsight ? (
                <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <Text style={styles.insightEmoji}>✨</Text>
                        <Text style={styles.insightType}>
                            {data.latestInsight.insight_type.charAt(0).toUpperCase() + data.latestInsight.insight_type.slice(1)}
                        </Text>
                    </View>
                    <Text style={styles.insightContent}>
                        {data.latestInsight.content}
                    </Text>
                    <Text style={styles.insightDate}>

                        {new Date(data.latestInsight.created_at).toLocaleDateString(
                            'en-GB',
                            { day: 'numeric', month: 'long' }
                        )}

                    </Text>
                </View>
                ) : (
                <View style={styles.insightEmptyCard}>
                    <Text style={styles.insightEmptyEmoji}>🤖</Text>
                    <Text style={styles.insightEmptyTitle}>
                        No insights yet
                    </Text>
                    <Text style={styles.insightEmptyText}>
                        Complete a few daily check-ins and Pacewell will start generating personalised insights for you.
                    </Text>
                </View>
                )}
            </View>

        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    inner: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    greetingSection: {
        marginBottom: 20,
    },
    greeting: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 4,
    },
    date: {
        fontSize: 14,
        color: '#888',
    },
    streakCard: {
        backgroundColor: '#fff8e1',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#ffe082',
    },
    streakEmoji: {
        fontSize: 32,
    },
    streakCount: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    streakSubtitle: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    checkInComplete: {
        backgroundColor: '#f0faf4',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: '#2d6a4f',
    },
    checkInCompleteEmoji: {
        fontSize: 28,
    },
    checkInCompleteTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d6a4f',
    },
    checkInCompleteSubtitle: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    checkInPending: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    checkInPendingEmoji: {
        fontSize: 28,
    },
    checkInPendingText: {
        flex: 1,
    },
    checkInPendingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
    },
    checkInPendingSubtitle: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    checkInArrow: {
        fontSize: 22,
        color: '#ccc',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    statEmoji: {
        fontSize: 28,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
    },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    activityEmoji: {
        fontSize: 28,
    },
    activityInfo: {
        flex: 1,
    },
    activityType: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 2,
    },
    activityMeta: {
        fontSize: 13,
        color: '#888',
    },
    activityDate: {
        fontSize: 12,
        color: '#aaa',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 16,
    },
    insightCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    insightEmoji: {
        fontSize: 20,
    },
    insightType: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2d6a4f',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    insightContent: {
        fontSize: 15,
        color: '#333',
        lineHeight: 24,
        marginBottom: 10,
    },
    insightDate: {
        fontSize: 12,
        color: '#aaa',
    },
    insightEmptyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    insightEmptyEmoji: {
        fontSize: 40,
        marginBottom: 12,
    },
    insightEmptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
    },
    insightEmptyText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
});