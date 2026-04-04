// ─── Emoji Scale ────────────────────────────────────────────────────────────

export type EmojiScale = 1 | 2 | 3 | 4 | 5;

export type EmojiScaleLabels = Record<EmojiScale, { emoji: string; label: string }>;
export const EMOJI_SCALE_MAP: Record<EmojiScale, { emoji: string; label: string }> = {
    1: { emoji: '😴', label: 'Very Low' },
    2: { emoji: '😔', label: 'Low' },
    3: { emoji: '😊', label: 'Neutral' },
    4: { emoji: '⚡', label: 'Good' },
    5: { emoji: '🔥', label: 'Excellent' },
};

// ─── User Profile ────────────────────────────────────────────────────────────

export type ActivityLevel = 'light' | 'moderate' | 'active' | 'athlete';

export interface UserProfile {
    id: string;
    full_name: string;
    age: number;
    primary_activity: string;
    activity_level: ActivityLevel;
    health_goals: string[];
    units: 'metric' | 'imperial';
    marketing_opt_in: boolean;
    avatar_url: string | null;
    created_at: string;
}

// ─── Daily Check-in ──────────────────────────────────────────────────────────

export interface DailyCheckIn {
    id: string;
    user_id: string;
    date: string;
    mood: EmojiScale;
    energy: EmojiScale;
    stress: EmojiScale;
    sleep_hours: number;
    sleep_quality: EmojiScale;
    notes?: string;
    created_at: string;
}

// ─── Physical Activity ───────────────────────────────────────────────────────

export type ActivityType =
    | 'running'
    | 'cycling'
    | 'swimming'
    | 'walking'
    | 'strength'
    | 'yoga'
    | 'tennis'
    | 'golf'
    | 'other';

export interface ActivityLog {
    id: string;
    user_id: string;
    date: string;
    activity_type: ActivityType;
    duration_minutes: number;
    perceived_exertion: EmojiScale;
    notes?: string;
    source: 'manual' | 'healthkit' | 'health_connect';
    created_at: string;
}

// ─── Nutrition ───────────────────────────────────────────────────────────────

export interface NutritionLog {
    id: string;
    user_id: string;
    date: string;
    water_intake_glasses: number;
    nutrition_quality: EmojiScale;
    skipped_meals: boolean;
    notes?: string;
    created_at: string;
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

export type InsightType = 'trend' | 'correlation' | 'anomaly' | 'prediction';

export interface AIInsight {
    id: string;
    user_id: string;
    insight_type: InsightType;
    title: string | null;
    content: string;
    data_range_start: string;
    data_range_end: string;
    created_at: string;
}

// ─── Aggregated Dashboard Data ───────────────────────────────────────────────

export interface WeeklySummary {
    week_start: string;
    avg_mood: number;
    avg_energy: number;
    avg_stress: number;
    avg_sleep_hours: number;
    avg_sleep_quality: number;
    total_activities: number;
    total_activity_minutes: number;
    avg_nutrition_quality: number;
}

// ─── Wearable / Health Data ───────────────────────────────────────────────────

export interface SleepData {
    totalHours: number;
    quality: EmojiScale;
    startTime: string;
    endTime: string;
    source: string;
  }
  
  export interface WorkoutData {
    id: string;
    activityType: ActivityType;
    durationMinutes: number;
    startTime: string;
    endTime: string;
    activeCalories: number | null;
    source: string;
  }
  
  export interface HeartRateData {
    average: number;
    min: number;
    max: number;
    resting: number | null;
    hrv: number | null;
    recordedAt: string;
  }
  
  export interface StepData {
    count: number;
    date: string;
  }
  
  export interface HealthSummary {
    sleep: SleepData | null;
    workouts: WorkoutData[];
    heartRate: HeartRateData | null;
    steps: StepData | null;
    lastSynced: string;
  }

  export interface HealthMetrics {
      id: string;
      user_id: string;
      date: string;
      avg_heart_rate: number | null;
      min_heart_rate: number | null;
      max_heart_rate: number | null;
      resting_heart_rate: number | null;
      hrv: number | null;
      step_count: number | null;
      source: string;
      created_at: string;
  }
  
  export type HealthPermissionStatus = 'granted' | 'denied' | 'not_determined';