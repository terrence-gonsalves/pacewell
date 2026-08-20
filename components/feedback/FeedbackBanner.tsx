import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../lib/theme';
import { FeedbackType, useFeedback } from '../../contexts/FeedbackContext';

const FEEDBACK_CONFIG: Record<
    FeedbackType,
    {
        icon: keyof typeof Ionicons.glyphMap;
        backgroundColor: string;
        borderColor: string;
        iconColor: string;
        textColor: string;
    }
> = {
    success: {
        icon: 'checkmark-circle-outline',
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
        iconColor: theme.colors.primary,
        textColor: theme.colors.textDark,
    },
    info: {
        icon: 'information-circle-outline',
        backgroundColor: theme.colors.infoLight,
        borderColor: theme.colors.info,
        iconColor: theme.colors.info,
        textColor: theme.colors.textDark,
    },
    error: {
        icon: 'alert-circle-outline',
        backgroundColor: theme.colors.dangerLight,
        borderColor: theme.colors.danger,
        iconColor: theme.colors.danger,
        textColor: theme.colors.textDark,
    },
};

export default function FeedbackBanner() {
    const { feedback, hideFeedback } = useFeedback();
    const [visibleFeedback, setVisibleFeedback] = useState(feedback);
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (feedback) {
            setVisibleFeedback(feedback);
            translateY.setValue(-100);
            opacity.setValue(0);

            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 240,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            return;
        }

        if (visibleFeedback) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setVisibleFeedback(null);
            });
        }
    }, [feedback, visibleFeedback, opacity, translateY]);

    if (!visibleFeedback) return null;

    const config = FEEDBACK_CONFIG[visibleFeedback.type];

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
            pointerEvents="box-none"
        >
            <View
                style={[
                    styles.banner,
                    {
                        backgroundColor: config.backgroundColor,
                        borderColor: config.borderColor,
                    },
                ]}
            >
                <Ionicons
                    name={config.icon}
                    size={22}
                    color={config.iconColor}
                />

                <Text
                    style={[
                        styles.message,
                        { color: config.textColor },
                    ]}
                >
                    {visibleFeedback.message}
                </Text>

                <Pressable
                    onPress={hideFeedback}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss message"
                    hitSlop={8}
                    style={styles.closeButton}
                >
                    <Ionicons
                        name="close"
                        size={20}
                        color={config.iconColor}
                    />
                </Pressable>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 900,
        elevation: 10,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.sm,
        ...theme.shadow.medium,
    },
    message: {
        ...theme.typography.body,
        flex: 1,
        lineHeight: 20,
    },
    closeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        marginRight: -4,
    },
});