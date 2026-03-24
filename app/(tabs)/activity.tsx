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
import { supabase } from '../../lib/supabase';
import { ActivityLog, ActivityType, EmojiScale, EmojiScaleLabels } from '../../types/health';

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

const DEFAULT_FORM = {
    activityType: 'walking' as ActivityType,
    duration: 30,
    perceivedExertion: 3 as EmojiScale,
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

export default function Activity() {
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);

    const updateForm = <K extends keyof typeof DEFAULT_FORM>(
        key: K,
        value: (typeof DEFAULT_FORM)[K]
    ) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

  // ─── Load Today's Activities ──────────────────────────────────────────────

    useFocusEffect(
        useCallback(() => {
            loadActivities();
        }, [])
    );

    const loadActivities = async () => {
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        const { data } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .order('created_at', { ascending: false });

        setActivities(data ?? []);
        setIsLoading(false);
    };

    // ─── Submit New Activity ──────────────────────────────────────────────────

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

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
            setIsSubmitting(false);

            return;
        }

        setForm(DEFAULT_FORM);
        setSheetVisible(false);

        await loadActivities();
        setIsSubmitting(false);
    };

    // ─── Delete Activity ──────────────────────────────────────────────────────

    const handleDelete = async (id: string) => {
        setIsDeleting(id);

        await supabase
            .from('activity_logs')
            .delete()
            .eq('id', id);

        await loadActivities();
        setIsDeleting(null);
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getActivityMeta = (type: ActivityType) =>
        ACTIVITY_TYPES.find(a => a.type === type) ?? ACTIVITY_TYPES[8];

    const today = new Date().toLocaleDateString('en-GB', {
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
            
            {isLoading ? (
            <View style={styles.centred}>
                <ActivityIndicator size="large" color="#2d6a4f" />
            </View>
            ) : activities.length === 0 ? (
            <View style={styles.centred}>
                <Text style={styles.emptyEmoji}>🏃</Text>
                <Text style={styles.emptyTitle}>No activities yet</Text>
                <Text style={styles.emptySubtitle}>
                    Tap the + button to log your first activity today
                </Text>
            </View>
            ) : (
            <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionLabel}>
                    Today's Activities ({activities.length})
                </Text>

                {activities.map(activity => {
                const meta = getActivityMeta(activity.activity_type);

                return (
                    <View key={activity.id} style={styles.activityCard}>
                        <View style={styles.activityLeft}>
                            <Text style={styles.activityEmoji}>{meta.emoji}</Text>
                            <View>
                                <Text style={styles.activityType}>{meta.label}</Text>
                                <Text style={styles.activityMeta}>
                                    {activity.duration_minutes} min •{' '}
                                    {EXERTION_LABELS[activity.perceived_exertion as EmojiScale].emoji}{' '}
                                    {EXERTION_LABELS[activity.perceived_exertion as EmojiScale].label}
                                </Text>

                                {activity.notes && (
                                <Text style={styles.activityNotes}>{activity.notes}</Text>
                                )}

                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDelete(activity.id)}
                            disabled={isDeleting === activity.id}
                        >

                            {isDeleting === activity.id ? (
                            <ActivityIndicator size="small" color="#e63946" />
                            ) : (
                            <Text style={styles.deleteButtonText}>✕</Text>
                            )}

                        </TouchableOpacity>
                    </View>
                );
                })}

            </ScrollView>

            )}
            
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setError(null);
                    setSheetVisible(true);
                }}
            >
                <Text style={styles.fabText}>+</Text>
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
                                step={5}
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
                                placeholderTextColor="#999"
                                value={form.notes}
                                onChangeText={val => updateForm('notes', val)}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                            
                            {error && (
                                <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}
                            
                            <TouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >

                                {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                                ) : (
                                <Text style={styles.submitButtonText}>Log Activity</Text>
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#f8f9fa',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 2,
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyEmoji: {
        fontSize: 56,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    activityEmoji: {
        fontSize: 32,
    },
    activityType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 2,
    },
    activityMeta: {
        fontSize: 13,
        color: '#888',
    },
    activityNotes: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        fontStyle: 'italic',
    },
    deleteButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 16,
        color: '#e63946',
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2d6a4f',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    fabText: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '300',
        lineHeight: 32,
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
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 12,
        marginTop: 8,
    },
    activityTypeRow: {
        gap: 10,
        paddingBottom: 8,
    },
    activityTypeButton: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
        minWidth: 72,
    },
    activityTypeButtonActive: {
        borderColor: '#2d6a4f',
        backgroundColor: '#f0faf4',
    },
    activityTypeEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    activityTypeLabel: {
        fontSize: 11,
        color: '#888',
        fontWeight: '500',
    },
    activityTypeLabelActive: {
        color: '#2d6a4f',
        fontWeight: '700',
    },
    emojiRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8,
    },
    emojiButton: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    emojiButtonActive: {
        borderColor: '#2d6a4f',
        backgroundColor: '#f0faf4',
    },
    emojiText: {
        fontSize: 22,
        marginBottom: 2,
    },
    emojiLabel: {
        fontSize: 9,
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
        justifyContent: 'center',
        gap: 24,
        marginBottom: 8,
    },
    stepperButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#2d6a4f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperButtonDisabled: {
        backgroundColor: '#e0e0e0',
    },
    stepperButtonText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '300',
    },
    stepperValue: {
        alignItems: 'center',
        minWidth: 80,
    },
    stepperValueText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    stepperUnit: {
        fontSize: 13,
        color: '#888',
    },
    notesInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minHeight: 80,
        marginBottom: 8,
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
    submitButton: {
        backgroundColor: '#2d6a4f',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});