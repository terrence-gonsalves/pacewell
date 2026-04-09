import { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onComplete: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomSplash({ onComplete }: SplashScreenProps) {
    const iconScale = useRef(new Animated.Value(0.3)).current;
    const iconOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const screenOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([

            // icon scales and fades in
            Animated.parallel([
                Animated.spring(iconScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(iconOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),

            // app name fades in
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),

            // tagline fades in
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),

            // hold for a moment
            Animated.delay(800),

            // entire screen fades out
            Animated.timing(screenOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onComplete();
        });
    }, []);

    // ─── Render ───────────────────────────────────────────────────────────────
    
    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
            <Animated.View
                style={[
                    styles.iconContainer,
                    {
                        opacity: iconOpacity,
                        transform: [{ scale: iconScale }],
                    },
                ]}
            >
                <Ionicons name="flash" size={48} color="#E8F5EE" />
            </Animated.View>
            
            <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
                Pacewell
            </Animated.Text>
            
            <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                Recovery tracking powered by AI
            </Animated.Text>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: '#2E7D52',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    appName: {
        fontSize: 37,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginBottom: 10,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '400',
        letterSpacing: 0.3,
    },
});