import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { ActivityLevel, UserProfile } from '../types/health';
import { theme } from '../lib/theme';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

// ─── Constants ───────────────────────────────────────────────────────────

const ACTIVITY_LEVELS: {
    value: ActivityLevel;
    label: string;
    description: string;
    icon: string;
}[] = [
    { value: 'light', label: 'Light', description: 'Sedentary work, stretching, or slow walking', icon: '🚶' },
    { value: 'moderate', label: 'Moderate', description: 'Regular walks or 1-2 workouts per week', icon: '🚴' },
    { value: 'active', label: 'Active', description: 'Strenuous exercise or sports 3-5 days a week', icon: '🏃' },
    { value: 'athlete', label: 'Athlete', description: 'Intense daily training or physical profession', icon: '🏅' },
];

const HEALTH_GOALS = [
    'Prevent injury',
    'Improve sleep',
    'Manage stress',
    'Increase energy',
    'Stay active longer',
    'Monitor recovery',
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditProfile() {
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

    // ─── Load Profile ──────────────────────────────────────────────────────────────

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setFullName(data.full_name);
            setAge(String(data.age));
            setActivityLevel(data.activity_level);
            setSelectedGoals(data.health_goals ?? []);
            setAvatarUrl(data.avatar_url ?? null);
        }

        setIsLoading(false);
    };

    // ─── Pick Image ──────────────────────────────────────────────────────────────

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission needed',
                'Please allow access to your photo library to set a profile photo.'
            );

            return;
        }
      
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });
      
        if (!result.canceled && result.assets[0]) {
            setAvatarPreview(result.assets[0].uri);
            setAvatarBase64(result.assets[0].base64 ?? null);
        }
    };
      
    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission needed',
                'Please allow camera access to take a profile photo.'
            );

            return;
        }
      
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });
      
        if (!result.canceled && result.assets[0]) {
            setAvatarPreview(result.assets[0].uri);
            setAvatarBase64(result.assets[0].base64 ?? null);
        }
    };
      
    const handleSelectPhotoSource = () => {
        Alert.alert(
            'Profile Photo',
            'Choose how to add your photo',
            [
                { text: 'Camera', onPress: handleTakePhoto },
                { text: 'Photo Library', onPress: handlePickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };
      
    const uploadAvatar = async (base64: string, uri: string): Promise<string | null> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return null;
        
            const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
            const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
            const filePath = `${user.id}/avatar.${fileExt}`;
        
            // convert base64 to Uint8Array for upload
            const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
            const byteCharacters = atob(base64Data);
            const byteArray = new Uint8Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteArray[i] = byteCharacters.charCodeAt(i);
            }
        
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, byteArray, {
                upsert: true,
                contentType,
                });
        
            if (uploadError) {
                console.error('Upload error:', uploadError);
                return null;
            }
        
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
        
            // add cache buster so updated photos reload correctly
            return `${data.publicUrl}?t=${Date.now()}`;      
        } catch (err) {
          console.error('Avatar upload error:', err);
          return null;
        }
    };

    const toggleGoal = (goal: string) => {
        setSelectedGoals(prev =>
            prev.includes(goal)
                ? prev.filter(g => g !== goal)
                : [...prev, goal]
        );
    };

    // ─── Save ──────────────────────────────────────────────────────────────

    const handleSave = async () => {
        setError(null);

        if (!fullName) { setError('Please enter your name.'); return; }
        if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 120) {
            setError('Please enter a valid age.');

            return;
        }

        if (!activityLevel) { setError('Please select your activity level.'); return; }
        if (selectedGoals.length === 0) {
            setError('Please select at least one health goal.');

            return;
        }

        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // upload avatar if a new one was selected
            let finalAvatarUrl = avatarUrl;

            if (avatarPreview && avatarBase64) {
                setIsUploadingAvatar(true);

                const uploaded = await uploadAvatar(avatarBase64, avatarPreview);

                if (uploaded) finalAvatarUrl = uploaded;

                setIsUploadingAvatar(false);
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    age: Number(age),
                    activity_level: activityLevel,
                    primary_activity: activityLevel,
                    health_goals: selectedGoals,
                    avatar_url: finalAvatarUrl,
                })
                .eq('id', user.id);

            if (error) {
                setError(error.message);

                return;
            }

            router.replace('/(tabs)/profile');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.inner}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.screenHeader}>
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)/profile')}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
                    </TouchableOpacity>

                    <Text style={styles.screenHeaderTitle}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.headerDivider} />
                
                <View style={styles.avatarSection}>
                    <View style={styles.avatarPreviewContainer}>

                        {avatarPreview || avatarUrl ? (
                        <Image
                            source={{ uri: avatarPreview ?? avatarUrl ?? '' }}
                            style={styles.avatarImage}
                        />
                        ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarPlaceholderText}>
                                {fullName?.charAt(0).toUpperCase() ?? '?'}
                            </Text>
                        </View>
                        )}

                        <TouchableOpacity
                            style={styles.avatarEditButton}
                            onPress={handleSelectPhotoSource}
                        >
                            <Ionicons name="camera" size={16} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>

                    {avatarPreview && (
                    <View style={styles.previewBadge}>
                        <Ionicons
                            name="information-circle-outline"
                            size={14}
                            color={theme.colors.primary}
                        />
                        <Text style={styles.previewBadgeText}>
                            Preview — tap Save Changes to apply
                        </Text>
                    </View>
                    )}

                    <TouchableOpacity
                        style={styles.changePhotoButton}
                        onPress={handleSelectPhotoSource}
                    >
                        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
                <Text style={styles.sectionSubtitle}>Keep your basic information up to date.</Text>

                <View style={styles.formCard}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="person-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Your full name"
                            placeholderTextColor={theme.colors.textLight}
                            autoComplete="name"
                        />
                    </View>

                    <Text style={styles.inputLabel}>Age</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={theme.colors.textSubtle}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            value={age}
                            onChangeText={setAge}
                            placeholder="Your age"
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="number-pad"
                        />
                    </View>
                </View>
                
                <Text style={styles.sectionLabel}>ACTIVITY LEVEL</Text>
                <Text style={styles.sectionSubtitle}>
                    Select the option that best describes your daily lifestyle.
                </Text>
                <View style={styles.activityLevelList}>

                    {ACTIVITY_LEVELS.map(level => (
                    <TouchableOpacity
                        key={level.value}
                        style={[
                            styles.activityCard,
                            activityLevel === level.value && styles.activityCardActive,
                        ]}
                        onPress={() => setActivityLevel(level.value)}
                    >
                        <View style={styles.activityCardLeft}>
                            <View style={[
                                styles.activityIconContainer,
                                activityLevel === level.value && styles.activityIconContainerActive,
                            ]}>
                                <Text style={styles.activityIcon}>{level.icon}</Text>
                            </View>
                            <View style={styles.activityCardText}>
                                <Text style={[
                                    styles.activityLabel,
                                    activityLevel === level.value && styles.activityLabelActive,
                                ]}>
                                    {level.label}
                                </Text>
                                <Text style={styles.activityDescription}>{level.description}</Text>
                            </View>
                        </View>

                        {activityLevel === level.value && (
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={theme.colors.primary}
                        />
                        )}

                    </TouchableOpacity>
                    ))}

                </View>
                
                <Text style={styles.sectionLabel}>HEALTH GOALS</Text>
                <Text style={styles.sectionSubtitle}>
                    What would you like to achieve in the next 3 months?
                </Text>
                <View style={styles.goalsGrid}>

                    {HEALTH_GOALS.map(goal => (
                    <TouchableOpacity
                        key={goal}
                        style={[
                            styles.goalChip,
                            selectedGoals.includes(goal) && styles.goalChipActive,
                        ]}
                        onPress={() => toggleGoal(goal)}
                    >
                        <Text style={[
                            styles.goalChipText,
                            selectedGoals.includes(goal) && styles.goalChipTextActive,
                        ]}>
                            {goal}
                        </Text>
                    </TouchableOpacity>
                    ))}

                </View>
                
                {error && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
                )}
                
                <View style={styles.privacyNote}>
                    <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color={theme.colors.textSubtle}
                    />
                    <Text style={styles.privacyText}>
                        Your data is used to personalise your workout recommendations and recovery plans. We never share your health info.
                    </Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.primaryButton, (isSaving || isUploadingAvatar) && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving || isUploadingAvatar}
                >

                    {isSaving || isUploadingAvatar ? (
                    <View style={styles.buttonInner}>
                        <ActivityIndicator color={theme.colors.white} size="small" />
                        <Text style={styles.primaryButtonText}>
                            {isUploadingAvatar ? 'Uploading photo...' : 'Saving...'}
                        </Text>
                    </View>
                    ) : (
                    <View style={styles.buttonInner}>
                        <Text style={styles.primaryButtonText}>Save Changes</Text>
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
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 60,
        paddingBottom: theme.spacing.xxl,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
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
    screenHeaderTitle: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
    },
    headerDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    sectionLabel: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
        ...theme.typography.label,
        color: theme.colors.textSubtle,
        marginBottom: theme.spacing.md,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.small,
    },
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textBody,
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    inputIcon: {
        marginRight: theme.spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: theme.colors.textDark,
    },
    activityLevelList: {
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    activityCardActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    activityCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
    },
    activityIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIconContainerActive: {
        backgroundColor: theme.colors.card,
    },
    activityIcon: {
        fontSize: 22,
    },
    activityCardText: {
        flex: 1,
    },
    activityLabel: {
        ...theme.typography.cardTitle,
        color: theme.colors.textDark,
        marginBottom: 2,
    },
    activityLabelActive: {
        color: theme.colors.primary,
    },
    activityDescription: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        lineHeight: 18,
    },
    goalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    goalChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.card,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    goalChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    goalChipText: {
        ...theme.typography.label,
        color: theme.colors.textBody,
    },
    goalChipTextActive: {
        color: theme.colors.white,
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
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    privacyText: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
        flex: 1,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        alignItems: 'center',
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    avatarPreviewContainer: {
        position: 'relative',
        marginBottom: theme.spacing.sm,
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: theme.colors.primary,
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 40,
        color: theme.colors.white,
        fontWeight: '700',
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    previewBadgeText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
    },
    changePhotoButton: {
        paddingVertical: theme.spacing.sm,
    },
    changePhotoText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        fontWeight: '600',
    },
});