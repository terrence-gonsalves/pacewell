import { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
    Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types/health';
import { scheduleDailyCheckInNotification } from '../../lib/notifications';
import { getLocalDate } from '../../lib/locale';
import { theme } from '../../lib/theme';
import { Image } from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_VERSION = Constants.expoConfig?.version ?? '0.7.1';
const UNITS_KEY = 'pacewell_units';
const NOTIF_TIME_KEY = 'pacewell_notif_time';
const WEEKLY_GOAL_KEY = 'pacewell_weekly_goal';

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
    light: 'Light',
    moderate: 'Moderate',
    active: 'Active',
    athlete: 'Athlete',
};

const ACTIVITY_LEVEL_ICONS: Record<string, string> = {
    light: '🚶',
    moderate: '🚴',
    active: '🏃',
    athlete: '🏅',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
    const [notifTime, setNotifTime] = useState('08:00');
    const [weeklyGoal, setWeeklyGoal] = useState(5);
    const [streak, setStreak] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [goalsModalVisible, setGoalsModalVisible] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSavingMarketing, setIsSavingMarketing] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempGoal, setTempGoal] = useState(5);

    // ─── Load Profile ──────────────────────────────────────────────────────────────

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const today = getLocalDate();
            const sevenDaysAgo = getLocalDate(
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            );

            const [profileResult, checkInsResult, storedUnits, storedNotifTime, storedGoal] =
                await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase
                        .from('daily_checkins')
                        .select('date')
                        .eq('user_id', user.id)
                        .gte('date', sevenDaysAgo)
                        .order('date', { ascending: false }),
                    AsyncStorage.getItem(UNITS_KEY),
                    AsyncStorage.getItem(NOTIF_TIME_KEY),
                    AsyncStorage.getItem(WEEKLY_GOAL_KEY),
                ]);

            if (profileResult.data) setProfile(profileResult.data);
            if (storedUnits) setUnits(storedUnits as 'metric' | 'imperial');
            if (storedNotifTime) setNotifTime(storedNotifTime);

            if (storedGoal) {
                setWeeklyGoal(Number(storedGoal));
                setTempGoal(Number(storedGoal));
            }

            // calculate streak
            const dates = (checkInsResult.data ?? []).map(c => c.date);
            setStreak(calculateStreak(dates, today));
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Calculate Streak ──────────────────────────────────────────────────────────────

    const calculateStreak = (dates: string[], today: string): number => {
        if (dates.length === 0) return 0;
      
        const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

        let streakCount = 0;
        let current = new Date(today + 'T12:00:00');
      
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

    const handleUnitsToggle = async (value: boolean) => {
        const newUnits = value ? 'imperial' : 'metric';

        setUnits(newUnits);

        await AsyncStorage.setItem(UNITS_KEY, newUnits);
    };

    const handleMarketingToggle = async (value: boolean) => {
        if (!profile) return;

        setIsSavingMarketing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            await supabase
                .from('profiles')
                .update({ marketing_opt_in: value })
                .eq('id', user.id);

            setProfile(prev => prev ? { ...prev, marketing_opt_in: value } : prev);
        } finally {
            setIsSavingMarketing(false);
        }
    };

    const handleNotifTimeSave = async (time: string) => {
        setNotifTime(time);

        await AsyncStorage.setItem(NOTIF_TIME_KEY, time);
        await scheduleDailyCheckInNotification(time);
    };

    const handleSaveWeeklyGoal = async () => {
        setWeeklyGoal(tempGoal);
        
        await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(tempGoal));

        setGoalsModalVisible(false);
    };

    // ─── Change Password ───────────────────────────────────────────────────────────────

    const handleChangePassword = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) return;

        Alert.alert(
            'Change Password',
            `We'll send a password reset link to ${user.email}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Link',
                    onPress: async () => {
                        await supabase.auth.resetPasswordForEmail(user.email!);
                        Alert.alert('Email sent', 'Check your inbox for the reset link.');
                    },
                },
            ]
        );
    };

    // ─── Delete ───────────────────────────────────────────────────────────────

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            Alert.alert('Type DELETE to confirm');

            return;
        }

        setIsDeleting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            await supabase.from('profiles').delete().eq('id', user.id);
            await supabase.auth.signOut();
        } catch {
            Alert.alert('Error', 'Could not delete account. Please try again.');
        } finally {
            setIsDeleting(false);
            setDeleteModalVisible(false);
        }
    };

    // ─── Sign Out ───────────────────────────────────────────────────────────────

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => await supabase.auth.signOut(),
                },
            ]
        );
    };

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
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>
                <View style={styles.headerDivider} />
                
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>

                        {profile?.avatar_url ? (
                        <Image
                            source={{ uri: profile.avatar_url }}
                            style={styles.avatarImage}
                        />
                        ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
                            </Text>
                        </View>
                        )}

                        <TouchableOpacity
                            style={styles.editAvatarButton}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Ionicons name="pencil" size={12} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.profileName}>{profile?.full_name ?? 'Pacewell User'}</Text>
                    <Text style={styles.profileAge}>
                        Age {profile?.age} · Since {new Date(profile?.created_at ?? '').getFullYear()}
                    </Text>
                    
                    <View style={styles.badgesRow}>
                        <View style={styles.activityBadge}>
                            <Text style={styles.activityBadgeEmoji}>
                                {ACTIVITY_LEVEL_ICONS[profile?.activity_level ?? 'moderate']}
                            </Text>
                            <Text style={styles.activityBadgeText}>
                                {ACTIVITY_LEVEL_LABELS[profile?.activity_level ?? 'moderate']} Tier
                            </Text>
                        </View>

                        {streak > 0 && (
                        <View style={styles.streakBadge}>
                            <Ionicons name="flash" size={12} color={theme.colors.primary} />
                            <Text style={styles.streakBadgeText}>{streak} Day Streak</Text>
                        </View>
                        )}

                    </View>
                    
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push('/edit-profile')}
                    >
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MY HEALTH</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => {
                                setTempGoal(weeklyGoal);
                                setGoalsModalVisible(true);
                            }}
                        >
                            <View style={styles.settingLeft}>
                                <View style={styles.settingIconContainer}>
                                    <Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Wellness Goals</Text>
                                    <Text style={styles.settingSubtitle}>
                                        {weeklyGoal} activities per week
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => Alert.alert(
                                'Coming Soon',
                                'Device sync will be available in the next update.'
                            )}
                        >
                            <View style={styles.settingLeft}>
                                <View style={styles.settingIconContainer}>
                                    <Ionicons name="watch-outline" size={18} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Sync Devices</Text>
                                    <Text style={styles.settingSubtitle}>
                                        Apple Health, Fitbit, Garmin
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <View style={styles.settingIconContainer}>
                                    <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Daily Reminders</Text>
                                    <Text style={styles.settingSubtitle}>Daily at {notifTime}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.timeButton}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Text style={styles.timeButtonText}>Change</Text>
                            </TouchableOpacity>
                        </View>

                        {showTimePicker && (
                        <DateTimePicker
                            value={(() => {
                                const [hours, minutes] = notifTime.split(':').map(Number);
                                const date = new Date();

                                date.setHours(hours, minutes, 0, 0);
                                
                                return date;
                            })()}
                            mode="time"
                            is24Hour={false}
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowTimePicker(false);

                                if (event.type === 'dismissed' || !selectedDate) return;

                                const hours = String(selectedDate.getHours()).padStart(2, '0');
                                const minutes = String(selectedDate.getMinutes()).padStart(2, '0');

                                handleNotifTimeSave(`${hours}:${minutes}`);
                            }}
                        />
                        )}

                        <View style={styles.divider} />
                        
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <View style={styles.settingIconContainer}>
                                    <Ionicons name="resize-outline" size={18} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Units</Text>
                                    <Text style={styles.settingSubtitle}>
                                        {units === 'metric' ? 'Metric (km, kg)' : 'Imperial (mi, lbs)'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={units === 'imperial'}
                                onValueChange={handleUnitsToggle}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={theme.colors.white}
                            />
                        </View>
                        
                        <View style={styles.divider} />

                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <View style={styles.settingIconContainer}>
                                    <Ionicons name="megaphone-outline" size={18} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Updates & Promotions</Text>
                                    <Text style={styles.settingSubtitle}>
                                        Be notified of updates & offers
                                    </Text>
                                </View>
                            </View>

                            {isSavingMarketing ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                            <Switch
                                value={profile?.marketing_opt_in ?? false}
                                onValueChange={handleMarketingToggle}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={theme.colors.white}
                            />
                            )}

                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={handleChangePassword}
                        >
                            <View style={styles.settingLeft}>
                                <View style={styles.settingIconContainer}>
                                    <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.settingLabel}>Change Password</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={handleSignOut}
                        >
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIconContainer, styles.settingIconDanger]}>
                                    <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
                                </View>
                                <Text style={[styles.settingLabel, styles.dangerText]}>Sign Out</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => {
                                setDeleteConfirmText('');
                                setDeleteModalVisible(true);
                            }}
                        >
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIconContainer, styles.settingIconDanger]}>
                                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                </View>
                                <Text style={[styles.settingLabel, styles.dangerText]}>
                                    Delete Account
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <View style={styles.footer}>
                    <Text style={styles.footerAppName}>Pacewell Wellness Companion</Text>
                    <Text style={styles.footerVersion}>Version {APP_VERSION}</Text>
                    <View style={styles.footerLinks}>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Terms of Service</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerDot}>·</Text>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            
            <Modal
                visible={goalsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setGoalsModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setGoalsModalVisible(false)}
                />
                <View style={styles.sheet}>
                    <View style={styles.sheetHandle} />

                    <Text style={styles.sheetTitle}>Wellness Goals</Text>
                    <Text style={styles.sheetSubtitle}>
                        Set your weekly activity target. This helps track your progress on the Activity screen.
                    </Text>

                    <Text style={styles.inputLabel}>Weekly activity target</Text>
                    <View style={styles.stepperRow}>
                        <TouchableOpacity
                            style={[styles.stepperButton, tempGoal <= 1 && styles.stepperButtonDisabled]}
                            onPress={() => setTempGoal(prev => Math.max(1, prev - 1))}
                            disabled={tempGoal <= 1}
                        >
                            <Text style={styles.stepperButtonText}>−</Text>
                        </TouchableOpacity>
                        <View style={styles.stepperValue}>
                            <Text style={styles.stepperValueText}>{tempGoal}</Text>
                            <Text style={styles.stepperUnit}>activities / week</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.stepperButton, tempGoal >= 14 && styles.stepperButtonDisabled]}
                            onPress={() => setTempGoal(prev => Math.min(14, prev + 1))}
                            disabled={tempGoal >= 14}
                        >
                            <Text style={styles.stepperButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleSaveWeeklyGoal}
                    >
                        <Text style={styles.primaryButtonText}>Save Goal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setGoalsModalVisible(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
            
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setDeleteModalVisible(false)}
                />
                <View style={styles.sheet}>
                    <View style={styles.sheetHandle} />

                    <Text style={styles.deleteModalTitle}>Delete Account</Text>
                    <Text style={styles.deleteModalText}>
                        This will permanently delete your account and all your health data. This cannot be undone.
                    </Text>
                    <Text style={styles.deleteModalText}>
                        Type <Text style={styles.deleteModalBold}>DELETE</Text> to confirm:
                    </Text>
                    <TextInput
                        style={styles.deleteInput}
                        value={deleteConfirmText}
                        onChangeText={setDeleteConfirmText}
                        placeholder="Type DELETE here"
                        placeholderTextColor={theme.colors.textLight}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity
                        style={[
                            styles.deleteConfirmButton,
                            deleteConfirmText !== 'DELETE' && styles.deleteConfirmButtonDisabled,
                        ]}
                        onPress={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    >
                        {isDeleting ? (
                        <ActivityIndicator color={theme.colors.white} />
                        ) : (
                        <Text style={styles.deleteConfirmButtonText}>Delete My Account</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setDeleteModalVisible(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
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
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        paddingBottom: 48,
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
    headerDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    profileCard: {
        backgroundColor: theme.colors.card,
        marginHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: theme.spacing.md,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        color: theme.colors.white,
        fontWeight: '700',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    profileName: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    profileAge: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        marginBottom: theme.spacing.md,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    activityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    activityBadgeEmoji: {
        fontSize: 14,
    },
    activityBadgeText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.card,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    streakBadgeText: {
        ...theme.typography.caption,
        color: theme.colors.textBody,
        fontWeight: '600',
    },
    editButton: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
    editButtonText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: theme.spacing.sm,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadow.small,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingIconDanger: {
        backgroundColor: theme.colors.dangerLight,
    },
    settingLabel: {
        ...theme.typography.body,
        color: theme.colors.textDark,
    },
    settingSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.md,
    },
    timeButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    timeButtonText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    versionText: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
    },
    aboutTextContainer: {
        padding: theme.spacing.md,
    },
    aboutText: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        lineHeight: 20,
    },
    dangerText: {
        color: theme.colors.danger,
    },
    footer: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    footerAppName: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        marginBottom: 4,
    },
    footerVersion: {
        ...theme.typography.caption,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.sm,
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    footerLink: {
        ...theme.typography.caption,
        color: theme.colors.primary,
    },
    footerDot: {
        ...theme.typography.caption,
        color: theme.colors.textLight,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        paddingBottom: 40,
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
        marginBottom: theme.spacing.sm,
    },
    sheetSubtitle: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        lineHeight: 20,
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textBody,
        marginBottom: theme.spacing.md,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
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
        minWidth: 100,
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
    primaryButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        ...theme.shadow.small,
    },
    primaryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
    },
    deleteModalTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.danger,
        marginBottom: theme.spacing.sm,
    },
    deleteModalText: {
        ...theme.typography.body,
        color: theme.colors.textBody,
        lineHeight: 22,
        marginBottom: theme.spacing.sm,
    },
    deleteModalBold: {
        fontWeight: '700',
        color: theme.colors.textDark,
    },
    deleteInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.textDark,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    deleteConfirmButton: {
        backgroundColor: theme.colors.danger,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    deleteConfirmButtonDisabled: {
        opacity: 0.4,
    },
    deleteConfirmButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
});