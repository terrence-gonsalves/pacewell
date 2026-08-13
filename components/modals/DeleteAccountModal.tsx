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
    Keyboard,
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
    const [mounted, setMounted] = useState(false);

    // animation values
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const sheetTranslateY = useRef(new Animated.Value(500)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setMounted(true);

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
            ]).start(() => {
                setMounted(false);
            });
        }
    }, [visible]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
        const showSubscription = Keyboard.addListener(showEvent, event => {
            Animated.timing(keyboardOffset, {
                toValue: event.endCoordinates.height,
                duration: 200,
                useNativeDriver: false,
            }).start();
        });
    
        const hideSubscription = Keyboard.addListener(hideEvent, () => {
            Animated.timing(keyboardOffset, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        });
    
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    // ─── Render ───────────────────────────────────────────────────────────

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.keyboardView}>
                <Animated.View
                    style={[styles.backdrop, { opacity: backdropOpacity }]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            bottom: keyboardOffset,
                            transform: [{ translateY: sheetTranslateY }],
                        },
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
                            returnKeyType="done"
                            submitBehavior="blurAndSubmit"
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
            </View>
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