import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../../lib/theme';
  
interface DeleteAccountModalProps {
    visible: boolean;
    deleteConfirmText: string;
    isDeleting: boolean;
    onClose: () => void;
    onConfirmTextChange: (text: string) => void;
    onDelete: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
  
export default function DeleteAccountModal({
    visible,
    deleteConfirmText,
    isDeleting,
    onClose,
    onConfirmTextChange,
    onDelete,
}: DeleteAccountModalProps) {

    // ─── Render ───────────────────────────────────────────────────────────

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
                    onChangeText={onConfirmTextChange}
                    placeholder="Type DELETE here"
                    placeholderTextColor={theme.colors.textLight}
                    autoCapitalize="characters"
                />
                <TouchableOpacity
                    style={[
                        styles.deleteConfirmButton,
                        deleteConfirmText !== 'DELETE' && styles.deleteConfirmButtonDisabled,
                    ]}
                    onPress={onDelete}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                >

                    {isDeleting ? (
                    <ActivityIndicator color={theme.colors.white} />
                    ) : (
                    <Text style={styles.deleteConfirmButtonText}>Delete My Account</Text>
                    )}
                    
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
    cancelButton: {
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        ...theme.typography.body,
        color: theme.colors.textSubtle,
    },
});