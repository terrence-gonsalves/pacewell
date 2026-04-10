import { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Animated,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
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

    // animation values
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const sheetTranslateY = useRef(new Animated.Value(500)).current;

    useEffect(() => {
        if (visible) {

            // fade in backdrop and slide up sheet simultaneously
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

        // fade out backdrop and slide down sheet
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

    // ─── Render ───────────────────────────────────────────────────────────

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                    <View style={styles.sheetHandle} />
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >            
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
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
  
const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
      },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
    sheet: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        paddingBottom: 40,
        maxHeight: '80%',
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