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
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types/health';

const APP_VERSION = Constants.expoConfig?.version ?? '0.4.0';
const UNITS_KEY = 'pacewell_units';
const NOTIF_TIME_KEY = 'pacewell_notif_time';

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
    light: '🚶 Light',
    moderate: '🚴 Moderate',
    active: '🏃 Active',
    athlete: '🏅 Athlete',
};

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
    const [notifTime, setNotifTime] = useState('08:00');
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSavingMarketing, setIsSavingMarketing] = useState(false);

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

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) setProfile(data);

            const storedUnits = await AsyncStorage.getItem(UNITS_KEY);

            if (storedUnits) setUnits(storedUnits as 'metric' | 'imperial');

            const storedNotifTime = await AsyncStorage.getItem(NOTIF_TIME_KEY);

            if (storedNotifTime) setNotifTime(storedNotifTime);
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setIsLoading(false);
        }
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
    };

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

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            Alert.alert('Type DELETE to confirm', 'Please type DELETE in capitals to confirm account deletion.');
            return;
        }

        setIsDeleting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            await supabase.from('profiles').delete().eq('id', user.id);
            await supabase.auth.signOut();
        } catch (err) {
            Alert.alert('Error', 'Could not delete account. Please try again.');
        } finally {
            setIsDeleting(false);
            setDeleteModalVisible(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure yo u want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.centred}>
                <ActivityIndicator size="large" color="#2d6a4f" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                        {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <Text style={styles.profileName}>{profile?.full_name ?? 'Pacewell User'}</Text>
                    <Text style={styles.profileAge}>Age {profile?.age}</Text>
                    <View style={styles.activityBadge}>
                        <Text style={styles.activityBadgeText}>
                            {ACTIVITY_LEVEL_LABELS[profile?.activity_level ?? 'moderate']}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push('/../edit-profile')}
                    >
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>
                
                {profile?.health_goals && profile.health_goals.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Health Goals</Text>
                    <View style={styles.goalsGrid}>

                        {profile.health_goals.map(goal => (
                        <View key={goal} style={styles.goalChip}>
                        <Text style={styles.goalChipText}>{goal}</Text>
                        </View>
                        ))}

                    </View>
                </View>
                )}
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingEmoji}>📏</Text>
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
                                trackColor={{ false: '#e0e0e0', true: '#2d6a4f' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={styles.divider} />
                        
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingEmoji}>🔔</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Check-in Reminder</Text>
                                    <Text style={styles.settingSubtitle}>Daily at {notifTime}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.timeButton}
                                onPress={() => {
                                    Alert.prompt(
                                        'Set Reminder Time',
                                        'Enter time in HH:MM format (e.g. 08:00)',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Save',
                                                onPress: (time: string | undefined) => {
                                                    if (time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
                                                        handleNotifTimeSave(time);
                                                    } else {
                                                        Alert.alert('Invalid time', 'Please use HH:MM format.');
                                                    }
                                                },
                                            },
                                        ],
                                        'plain-text',
                                        notifTime
                                    );
                                }}
                            >
                                <Text style={styles.timeButtonText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* About */}
                <View style={styles.section}>
                <Text style={styles.sectionTitle}>About Pacewell</Text>
                <View style={styles.card}>
                    <Text style={styles.aboutText}>
                    Pacewell helps active adults 50+ track recovery, spot patterns, and stay ahead of injury — using AI to turn daily check-ins into genuinely useful insights.
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingEmoji}>📱</Text>
                        <Text style={styles.settingLabel}>Version</Text>
                    </View>
                    <Text style={styles.versionText}>{APP_VERSION}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingEmoji}>📣</Text>
                        <View>
                        <Text style={styles.settingLabel}>Updates & Promotions</Text>
                        <Text style={styles.settingSubtitle}>
                            Be notified of new features and offers
                        </Text>
                        </View>
                    </View>
                    {isSavingMarketing ? (
                        <ActivityIndicator size="small" color="#2d6a4f" />
                    ) : (
                        <Switch
                        value={profile?.marketing_opt_in ?? false}
                        onValueChange={handleMarketingToggle}
                        trackColor={{ false: '#e0e0e0', true: '#2d6a4f' }}
                        thumbColor="#fff"
                        />
                    )}
                    </View>
                </View>
                </View>

                {/* Account */}
                <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>

                    <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleChangePassword}
                    >
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingEmoji}>🔑</Text>
                        <Text style={styles.settingLabel}>Change Password</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleSignOut}
                    >
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingEmoji}>🚪</Text>
                        <Text style={styles.settingLabel}>Sign Out</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
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
                        <Text style={styles.settingEmoji}>🗑️</Text>
                        <Text style={[styles.settingLabel, styles.dangerText]}>
                        Delete Account
                        </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>

                </View>
                </View>

            </ScrollView>

            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setDeleteModalVisible(false)}
                />
                <View style={styles.deleteModal}>
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
                        placeholderTextColor="#999"
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
                        <ActivityIndicator color="#fff" />
                        ) : (
                        <Text style={styles.deleteConfirmButtonText}>Delete My Account</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteCancelButton}
                        onPress={() => setDeleteModalVisible(false)}
                    >
                        <Text style={styles.deleteCancelButtonText}>Cancel</Text>
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
        backgroundColor: '#f8f9fa',
    },
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#2d6a4f',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '700',
    },
    profileName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 4,
    },
    profileAge: {
        fontSize: 15,
        color: '#888',
        marginBottom: 12,
    },
    activityBadge: {
        backgroundColor: '#f0faf4',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2d6a4f',
        marginBottom: 16,
    },
    activityBadgeText: {
        fontSize: 13,
        color: '#2d6a4f',
        fontWeight: '600',
    },
    editButton: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#2d6a4f',
    },
    editButtonText: {
        fontSize: 14,
        color: '#2d6a4f',
        fontWeight: '600',
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
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    settingEmoji: {
        fontSize: 20,
    },
    settingLabel: {
        fontSize: 15,
        color: '#1a1a2e',
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 16,
    },
    chevron: {
        fontSize: 20,
        color: '#ccc',
        fontWeight: '300',
    },
    timeButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f0faf4',
        borderWidth: 1,
        borderColor: '#2d6a4f',
    },
    timeButtonText: {
        fontSize: 13,
        color: '#2d6a4f',
        fontWeight: '600',
    },
    versionText: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    aboutText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
        padding: 16,
    },
    goalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    goalChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#f0faf4',
        borderWidth: 1,
        borderColor: '#2d6a4f',
    },
    goalChipText: {
        fontSize: 13,
        color: '#2d6a4f',
        fontWeight: '500',
    },
    dangerText: {
        color: '#e63946',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    deleteModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 28,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#e63946',
        marginBottom: 12,
    },
    deleteModalText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
        marginBottom: 12,
    },
    deleteModalBold: {
        fontWeight: '700',
        color: '#1a1a2e',
    },
    deleteInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 16,
    },
    deleteConfirmButton: {
        backgroundColor: '#e63946',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    deleteConfirmButtonDisabled: {
        opacity: 0.4,
    },
    deleteConfirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteCancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    deleteCancelButtonText: {
        fontSize: 15,
        color: '#888',
        fontWeight: '500',
    },
});