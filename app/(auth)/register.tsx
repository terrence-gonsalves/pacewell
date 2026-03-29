import { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ActivityLevel } from '../../types/health';
import { theme } from '../../lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Register() {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Step 1 Validation ──────────────────────────────────────────────────

    const handleStepOne = () => {
        setError(null);
        if (!email || !password || !confirmPassword) {
            setError('Please fill in all fields.');

            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');

            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');

            return;
        }

          setStep(2);
    };

    // ─── Goal Toggle ────────────────────────────────────────────────────────

    const toggleGoal = (goal: string) => {
        setSelectedGoals(prev =>
            prev.includes(goal)
              ? prev.filter(g => g !== goal)
              : [...prev, goal]
        );
    };

    // ─── Final Submission ───────────────────────────────────────────────────

    const handleSubmit = async () => {
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

        setLoading(true);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    age: Number(age),
                    primary_activity: activityLevel,
                    activity_level: activityLevel,
                    health_goals: selectedGoals,
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);

            return;
        }

        router.replace({
            pathname: '/(auth)/login',
            params: {
                message: 'Please check your email to confirm your account before signing in.',
            },
        });

        setLoading(false);
    };

    // ─── Step 1 ─────────────────────────────────────────────────────────────

    const renderStepOne = () => (
      <>
          <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
              </TouchableOpacity>
              <Text style={styles.screenHeaderTitle}>Create Account</Text>
              <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '50%' }]} />
              </View>
              <View style={styles.progressLabels}>
                  <Text style={styles.progressStep}>STEP 1 OF 2</Text>
                  <Text style={styles.progressLabel}>Account Details</Text>
              </View>
          </View>

          <Text style={styles.title}>Welcome to Pacewell</Text>
          <Text style={styles.subtitle}>
              Let's get your account set up for your wellness journey.
          </Text>

          <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                  <Ionicons
                      name="mail-outline"
                      size={18}
                      color={theme.colors.textSubtle}
                      style={styles.inputIcon}
                  />
                  <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor={theme.colors.textLight}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                  />
              </View>

              <Text style={styles.inputLabel}>Create Password</Text>
              <View style={styles.inputWrapper}>
                  <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={theme.colors.textSubtle}
                      style={styles.inputIcon}
                  />
                  <TextInput
                      style={styles.input}
                      placeholder="Must be at least 8 characters"
                      placeholderTextColor={theme.colors.textLight}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.inputIconRight}
                  >
                      <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={theme.colors.textSubtle}
                      />
                  </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                  <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={theme.colors.textSubtle}
                      style={styles.inputIcon}
                  />
                  <TextInput
                      style={styles.input}
                      placeholder="Repeat your password"
                      placeholderTextColor={theme.colors.textLight}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.inputIconRight}
                  >
                      <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={theme.colors.textSubtle}
                      />
                  </TouchableOpacity>
              </View>

              {error && (
                  <View style={styles.errorBox}>
                      <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                      <Text style={styles.errorText}>{error}</Text>
                  </View>
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={handleStepOne}>
                  <View style={styles.buttonInner}>
                      <Text style={styles.primaryButtonText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
                  </View>
              </TouchableOpacity>
          </View>

          <TouchableOpacity
              style={styles.signInLink}
              onPress={() => router.back()}
          >
              <Text style={styles.signInText}>
                  Already have an account?{' '}
                  <Text style={styles.signInTextBold}>Sign In</Text>
              </Text>
          </TouchableOpacity>
      </>
    );

    // ─── Step 2 ─────────────────────────────────────────────────────────────

    const renderStepTwo = () => (
      <>
          <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => { setStep(1); setError(null); }}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
              </TouchableOpacity>
              <Text style={styles.screenHeaderTitle}>Create Account</Text>
              <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '100%' }]} />
              </View>
              <View style={styles.progressLabels}>
                  <Text style={styles.progressStep}>STEP 2 OF 2</Text>
                  <Text style={styles.progressLabel}>Your Profile</Text>
              </View>
          </View>

          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>
              Help us personalise your recovery insights.
          </Text>

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
                      placeholder="Your full name"
                      placeholderTextColor={theme.colors.textLight}
                      value={fullName}
                      onChangeText={setFullName}
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
                      placeholder="Your age"
                      placeholderTextColor={theme.colors.textLight}
                      value={age}
                      onChangeText={setAge}
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
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
          >

              {loading ? (
              <ActivityIndicator color={theme.colors.white} />
              ) : (
              <View style={styles.buttonInner}>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
              </View>
              )}

          </TouchableOpacity>
      </>
    );

    // ─── Main Render ────────────────────────────────────────────────────────

    return (
      <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
          <ScrollView
              contentContainerStyle={styles.inner}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >
              {step === 1 ? renderStepOne() : renderStepTwo()}
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
  inner: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.xxl,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  screenHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSubtle,
  },
  title: {
    ...theme.typography.screenTitle,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSubtle,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
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
  inputIconRight: {
    marginLeft: theme.spacing.sm,
    padding: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.textDark,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  sectionSubtitle: {
    ...theme.typography.label,
    color: theme.colors.textSubtle,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
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
  signInLink: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  signInText: {
    ...theme.typography.body,
    color: theme.colors.textSubtle,
  },
  signInTextBold: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});