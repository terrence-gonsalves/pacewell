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
import { supabase } from '../lib/supabase';
import { generateInsights } from '../lib/anthropic';
import { AIInsight } from '../types/health';
import { formatDate, parseLocalDate } from '../lib/locale';

const INSIGHT_CONFIG: Record<string, { emoji: string; colour: string; bg: string }> = {
    trend: { emoji: '📈', colour: '#2d6a4f', bg: '#f0faf4' },
    correlation: { emoji: '🔗', colour: '#1565c0', bg: '#e3f2fd' },
    anomaly: { emoji: '⚠️', colour: '#e65100', bg: '#fff3e0' },
    prediction: { emoji: '🔮', colour: '#6a1b9a', bg: '#f3e5f5' },
};

export default function Insights() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

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
                setMessage('New insights generated successfully.');
            }
        } else {
            setMessage(result.message ?? 'Something went wrong. Please try again.');
        }

        setIsGenerating(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Insights</Text>
                    <View style={{ width: 60 }} />
                </View>
                
                <TouchableOpacity
                    style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                    onPress={handleGenerateInsights}
                    disabled={isGenerating}
                >

                    {isGenerating ? (
                    <View style={styles.generateButtonInner}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.generateButtonText}>Analysing your data...</Text>
                    </View>
                    ) : (
                    <View style={styles.generateButtonInner}>
                        <Text style={styles.generateButtonEmoji}>✨</Text>
                        <Text style={styles.generateButtonText}>Generate New Insights</Text>
                    </View>
                    )}

                </TouchableOpacity>
                
                {message && (
                <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{message}</Text>
                </View>
                )}
                
                {isLoading ? (
                <View style={styles.centred}>
                    <ActivityIndicator size="large" color="#2d6a4f" />
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
                        {insights.length} insight{insights.length !== 1 ? 's' : ''} generated
                    </Text>

                    {insights.map(insight => {
                    const config = INSIGHT_CONFIG[insight.insight_type] ?? INSIGHT_CONFIG.trend;

                    return (
                        <View
                            key={insight.id}
                            style={[styles.insightCard, { backgroundColor: config.bg }]}
                        >
                            <View style={styles.insightHeader}>
                                <Text style={styles.insightEmoji}>{config.emoji}</Text>
                                <View style={[styles.insightBadge, { backgroundColor: config.colour }]}>
                                    <Text style={styles.insightBadgeText}>
                                        {insight.insight_type.charAt(0).toUpperCase() +
                                        insight.insight_type.slice(1)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.insightContent}>{insight.content}</Text>
                            <View style={styles.insightFooter}>
                                <Text style={styles.insightDate}>
                                    Generated {formatDate(parseLocalDate(insight.created_at.split('T')[0]), {
                                        day: 'numeric',
                                        month: 'long',
                                    })}
                                </Text>
                                <Text style={styles.insightRange}>
                                    Data: {formatDate(parseLocalDate(insight.data_range_start), {
                                        day: 'numeric',
                                        month: 'short',
                                    })} – {formatDate(parseLocalDate(insight.data_range_end), {
                                        day: 'numeric',
                                        month: 'short',
                                    })}
                                </Text>
                            </View>
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
        backgroundColor: '#f8f9fa',
    },
    inner: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
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
    generateButton: {
        backgroundColor: '#2d6a4f',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    generateButtonDisabled: {
        opacity: 0.7,
    },
    generateButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    generateButtonEmoji: {
        fontSize: 18,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    messageBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        lineHeight: 20,
    },
    centred: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 48,
        paddingHorizontal: 16,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    insightCard: {
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    insightEmoji: {
        fontSize: 22,
    },
    insightBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    insightBadgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    insightContent: {
        fontSize: 15,
        color: '#1a1a2e',
        lineHeight: 24,
        marginBottom: 12,
    },
    insightFooter: {
        gap: 2,
    },
    insightDate: {
        fontSize: 12,
        color: '#888',
    },
    insightRange: {
        fontSize: 12,
        color: '#aaa',
    },
});