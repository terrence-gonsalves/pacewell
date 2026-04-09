import { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
    Switch,
    Animated,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    SyncSettings,
    SYNC_INTERVALS,
    getSyncSettings,
    saveSyncSettings,
    scheduleBackgroundSync,
    cancelBackgroundSync,
    performHealthSync,
    getLastSyncedFormatted,
} from '../lib/syncManager';
import { theme } from '../lib/theme';

interface SyncSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onSyncComplete: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SyncSettingsModal({
  visible,
  onClose,
  onSyncComplete,
}: SyncSettingsModalProps) {
  const [settings, setSettings] = useState<SyncSettings>({
    enabled: false,
    intervalHours: 4,
    startTime: '08:00',
    lastSynced: null,
  });
  const [lastSyncedText, setLastSyncedText] = useState('Never');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      loadSettings();
      // Fade in backdrop and slide up sheet simultaneously
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out backdrop and slide down sheet
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 500,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadSettings = async () => {
    const saved = await getSyncSettings();
    setSettings(saved);
    const lastSynced = await getLastSyncedFormatted();
    setLastSyncedText(lastSynced);
  };

  const handleToggleEnabled = (value: boolean) => {
    setSettings(prev => ({ ...prev, enabled: value }));
  };

  const handleIntervalSelect = (hours: number) => {
    setSettings(prev => ({ ...prev, intervalHours: hours }));
  };

  const handleTimeSave = (time: string) => {
    setSettings(prev => ({ ...prev, startTime: time }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSyncSettings(settings);

      if (settings.enabled) {
        await scheduleBackgroundSync(settings.intervalHours);
      } else {
        await cancelBackgroundSync();
      }

      onClose();
    } catch (err) {
      console.error('Error saving sync settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    const result = await performHealthSync();

    if (result.success) {
      const lastSynced = await getLastSyncedFormatted();
      setLastSyncedText(lastSynced);
      setSyncMessage('Sync complete ✅');
      onSyncComplete();
    } else {
      setSyncMessage(`Sync failed: ${result.message}`);
    }

    setIsSyncing(false);
  };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>
            
            <Animated.View
                style={[
                    styles.sheetContainer,
                    { transform: [{ translateY: sheetTranslateY }] },
                ]}
            >
                <View style={styles.handle} />
                
                <View style={styles.header}>
                    <Text style={styles.title}>Sync Devices</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={20} color={theme.colors.textSubtle} />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.lastSyncedRow}>
                    <Ionicons
                        name="time-outline"
                        size={16}
                        color={theme.colors.textSubtle}
                    />
                    <Text style={styles.lastSyncedText}>
                        Last synced: {lastSyncedText}
                    </Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.syncNowButton, isSyncing && styles.syncNowButtonDisabled]}
                    onPress={handleManualSync}
                    disabled={isSyncing}
                >
                
                    {isSyncing ? (
                    <View style={styles.syncNowInner}>
                        <ActivityIndicator size="small" color={theme.colors.white} />
                        <Text style={styles.syncNowText}>Syncing...</Text>
                    </View>
                    ) : (
                    <View style={styles.syncNowInner}>
                        <Ionicons name="sync" size={18} color={theme.colors.white} />
                        <Text style={styles.syncNowText}>Sync Now</Text>
                    </View>
                    )}

                </TouchableOpacity>
                
                {syncMessage && (
                <View style={styles.syncMessage}>
                    <Text style={styles.syncMessageText}>{syncMessage}</Text>
                </View>
                )}
                
                <View style={styles.divider} />
                
                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <View style={styles.settingIcon}>
                            <Ionicons
                                name="refresh-circle-outline"
                                size={20}
                                color={theme.colors.primary}
                            />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Auto Sync</Text>
                            <Text style={styles.settingSubtitle}>
                                Sync health data automatically
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.enabled}
                        onValueChange={handleToggleEnabled}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        thumbColor={theme.colors.white}
                    />
                </View>
                
                {settings.enabled && (
                <>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Ionicons
                                    name="alarm-outline"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Start Time</Text>
                                <Text style={styles.settingSubtitle}>
                                    First sync at {settings.startTime}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.changeButton}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={styles.changeButtonText}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    {showTimePicker && (
                    <DateTimePicker
                        value={(() => {
                            const [hours, minutes] = settings.startTime.split(':').map(Number);
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

                            handleTimeSave(`${hours}:${minutes}`);
                        }}
                    />
                    )}
                    
                    <View style={styles.intervalSection}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Ionicons
                                    name="timer-outline"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                            </View>
                            <Text style={styles.settingLabel}>Sync Every</Text>
                        </View>
                        <View style={styles.intervalGrid}>

                            {SYNC_INTERVALS.map(interval => (
                            <TouchableOpacity
                                key={interval.value}
                                style={[
                                    styles.intervalChip,
                                    settings.intervalHours === interval.value && styles.intervalChipActive,
                                ]}
                                onPress={() => handleIntervalSelect(interval.value)}
                            >
                                <Text style={[
                                    styles.intervalChipText,
                                    settings.intervalHours === interval.value && styles.intervalChipTextActive,
                                ]}>
                                    {interval.label}
                                </Text>
                            </TouchableOpacity>
                            ))}

                        </View>
                    </View>
                </>
                )}
                
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                
                    {isSaving ? (
                    <ActivityIndicator color={theme.colors.white} />
                    ) : (
                    <View style={styles.saveButtonInner}>
                        <Text style={styles.saveButtonText}>Save Settings</Text>
                        <Ionicons name="checkmark" size={18} color={theme.colors.white} />
                    </View>
                    )}

                </TouchableOpacity>

            </Animated.View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetContainer: {
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
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: theme.spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    title: {
        ...theme.typography.sectionHeading,
        color: theme.colors.textDark,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    lastSyncedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    lastSyncedText: {
        ...theme.typography.caption,
        color: theme.colors.textSubtle,
    },
    syncNowButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    syncNowButtonDisabled: {
        opacity: 0.6,
    },
    syncNowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    syncNowText: {
        color: theme.colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
    syncMessage: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    syncMessageText: {
        ...theme.typography.label,
        color: theme.colors.primary,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
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
    changeButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    changeButtonText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    intervalSection: {
        marginBottom: theme.spacing.md,
    },
    intervalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.sm,
        marginLeft: 52,
    },
    intervalChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    intervalChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    intervalChipText: {
        ...theme.typography.caption,
        color: theme.colors.textBody,
        fontWeight: '500',
    },
    intervalChipTextActive: {
        color: theme.colors.white,
        fontWeight: '700',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
});