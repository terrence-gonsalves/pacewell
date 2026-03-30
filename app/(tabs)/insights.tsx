import { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { generateInsights } from '../../lib/anthropic';
import { AIInsight } from '../../types/health';
import { formatDate, parseLocalDate } from '../../lib/locale';
import { theme } from '../../lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const INSIGHT_CONFIG: Record<string, {
    icon: string;
    colour: string;
    bg: string;
    borderColor: string;
    label: string;
}> = {
    trend: {
        icon: 'trending-up',
        colour: theme.colors.primary,
        bg: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
        label: 'Trend',
    },
    correlation: {
        icon: 'git-compare',
        colour: theme.colors.info,
        bg: theme.colors.infoLight,
        borderColor: theme.colors.info,
        label: 'Correlation',
    },
    anomaly: {
        icon: 'warning',
        colour: theme.colors.warning,
        bg: theme.colors.warningLight,
        borderColor: theme.colors.warning,
        label: 'Anomaly',
    },
    prediction: {
        icon: 'telescope',
        colour: theme.colors.purple,
        bg: theme.colors.purpleLight,
        borderColor: theme.colors.purple,
        label: 'Prediction',
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractTitle = (content: string): string => {

    // take the first sentence as the title, max 60 chars
    const firstSentence = content.split('.')[0];

    if (firstSentence.length <= 60) return firstSentence;

    return firstSentence;
};

const extractBody = (content: string): string => {

    // everything after the first sentence
    const dotIndex = content.indexOf('.');

    if (dotIndex === -1 || dotIndex === content.length - 1) return content;

    return content.substring(dotIndex + 1).trim();
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Insights() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadInsights();
        }, [])
    );

    const loadInsights = async () => {
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data } = await supabase
                .from('ai_insights')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            setInsights(data ?? []);
        } catch (err) {
            console.error('Error loading insights:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInsights = async () => {
        setIsGenerating(true);
        setMessage(null);

        const result = await generateInsights();

        if (result.success) {
            if (result.message) {
                setMessage(result.message);
            } else {
                await loadInsights();
                setMessage(null);
            }
        } else {
            setMessage(result.message ?? 'Something went wrong. Please try again.');
        }

        setIsGenerating(false);
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Health Insights</Text>
                    <TouchableOpacity
                        onPress={handleGenerateInsights}
                        disabled={isGenerating}
                        style={styles.refreshButton}
                    >

                        {isGenerating ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                        <Ionicons
                            name="refresh"
                            size={22}
                            color={theme.colors.primary}
                        />
                        )}

                    </TouchableOpacity>
                </View>
                <View style={styles.headerDivider} />
                
                <View style={styles.heroBanner}>
                    <View style={styles.heroIconContainer}>
                        <Ionicons name="flash" size={28} color={theme.colors.white} />
                    </View>
                    <Text style={styles.heroTitle}>Unlock Your AI Insights</Text>
                    <Text style={styles.heroSubtitle}>
                        We've analysed your health data. See what we found.
                    </Text>
                    <TouchableOpacity
                        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                        onPress={handleGenerateInsights}
                        disabled={isGenerating}
                    >

                        {isGenerating ? (
                        <View style={styles.generateButtonInner}>
                            <ActivityIndicator color={theme.colors.primary} size="small" />
                            <Text style={styles.generateButtonText}>Analysing your data...</Text>
                        </View>
                        ) : (
                        <View style={styles.generateButtonInner}>
                            <Text style={styles.generateButtonText}>Generate New Insights</Text>
                        </View>
                        )}

                    </TouchableOpacity>
                </View>
                
                {message && (
                <View style={styles.messageBox}>
                    <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color={theme.colors.primary}
                    />
                    <Text style={styles.messageText}>{message}</Text>
                </View>
                )}
                
                {isLoading ? (
                <View style={styles.centred}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
                ) : insights.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🤖</Text>
                    <Text style={styles.emptyTitle}>No insights yet</Text>
                    <Text style={styles.emptyText}>
                        Complete at least 3 daily check-ins then tap Generate New Insights above to see your personalised analysis.
                    </Text>
                </View>
                ) : (
                <>
                    <Text style={styles.sectionLabel}>
                        Your Latest Findings
                    </Text>

                    {insights.map(insight => {
                    const config = INSIGHT_CONFIG[insight.insight_type] ?? INSIGHT_CONFIG.trend;
                    const isExpanded = expandedId === insight.id;
                    const title = extractTitle(insight.content);
                    const body = extractBody(insight.content);

                    return (
                        <View
                            key={insight.id}
                            style={[
                                styles.insightCard,
                                {
                                    backgroundColor: config.bg,
                                    borderColor: config.borderColor,
                                },
                            ]}
                        >
                            <View style={styles.insightCardHeader}>
                                <View style={styles.insightTypeRow}>
                                    <Ionicons
                                        name={config.icon as any}
                                        size={16}
                                        color={config.colour}
                                    />
                                    <Text style={[styles.insightTypeLabel, { color: config.colour }]}>
                                        {config.label}
                                    </Text>
                                </View>
                                <Text style={styles.insightCardDate}>

                                    {formatDate(
                                        parseLocalDate(insight.created_at.split('T')[0]),
                                        { day: 'numeric', month: 'short' }
                                    )}

                                </Text>
                            </View>

                            <Text style={styles.insightDataRange}>
                                Data: {formatDate(parseLocalDate(insight.data_range_start), {
                                    day: 'numeric', month: 'short',
                                })} – {formatDate(parseLocalDate(insight.data_range_end), {
                                    day: 'numeric', month: 'short',
                                })}
                            </Text>
                            
                            <Text style={styles.insightCardTitle}>{title}</Text>
                            
                            {isExpanded && body ? (
                            <Text style={styles.insightCardBody}>{body}</Text>
                            ) : null}
                            
                            
                            {body ? (
                            <TouchableOpacity
                                onPress={() => toggleExpand(insight.id)}
                                style={styles.learnMoreButton}
                            >
                                <Text style={[styles.learnMoreText, { color: config.colour }]}>
                                    {isExpanded ? 'Show less' : 'More'} {isExpanded ? '↑' : '›'}
                                </Text>
                            </TouchableOpacity>
                            ) : null}

                        </View>
                    );
                    })}

                </>
                )}

            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    inner: {
        paddingBottom: 48,
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
        ...theme.typography.screenTitle,
        color: theme.colors.textDark,
    },
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    heroBanner: {
        backgroundColor: theme.colors.primary,
        marginHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        ...theme.shadow.medium,
    },
    heroIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.white,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    heroSubtitle: {
        ...theme.typography.label,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        lineHeight: 20,
    },
    generateButton: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.md,
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.xl,
        width: '100%',
        alignItems: 'center',
    },
    generateButtonDisabled: {
        opacity: 0.7,
    },
    generateButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    generateButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    messageBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    messageText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        flex: 1,
        lineHeight: 20,
    },
    centred: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.xl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: theme.spacing.md,
    },
    emptyTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionLabel: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    insightCard: {
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
    },
    insightCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    insightTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    insightTypeLabel: {
        ...theme.typography.caption,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    insightCardDate: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    insightCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
        lineHeight: 22,
    },
    insightCardBody: {
        ...theme.typography.body,
        color: theme.colors.textBody,
        lineHeight: 22,
        marginBottom: theme.spacing.sm,
    },
    insightDataRange: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        marginBottom: theme.spacing.xs,
    },
    learnMoreButton: {
        marginTop: theme.spacing.xs,
    },
    learnMoreText: {
        ...theme.typography.label,
        fontWeight: '600',
    },
});