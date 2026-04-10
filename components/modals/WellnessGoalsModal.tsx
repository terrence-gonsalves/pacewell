import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
} from 'react-native';
import { theme } from '../../lib/theme';
  
interface WellnessGoalsModalProps {
    visible: boolean;
    tempGoal: number;
    onClose: () => void;
    onSave: () => void;
    onIncrement: () => void;
    onDecrement: () => void;
}
  
// ─── Main Component ───────────────────────────────────────────────────────────

export default function WellnessGoalsModal({
    visible,
    tempGoal,
    onClose,
    onSave,
    onIncrement,
    onDecrement,
}: WellnessGoalsModalProps) {

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={styles.backdrop} onPress={onClose} />
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
                        onPress={onDecrement}
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
                        onPress={onIncrement}
                        disabled={tempGoal >= 14}
                    >
                        <Text style={styles.stepperButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
        
                <TouchableOpacity style={styles.primaryButton} onPress={onSave}>
                    <Text style={styles.primaryButtonText}>Save Goal</Text>
                </TouchableOpacity>
        
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
  
const styles = StyleSheet.create({
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
});