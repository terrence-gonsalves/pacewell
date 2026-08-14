import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
    name: IoniconName;
    color: string;
    size: number;
}

const TabIcon = ({ name, color, size }: TabIconProps) => (
    <Ionicons name={name} color={color} size={size} />
);

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const { fontScale } = useWindowDimensions();
    const tabBarHeight = 64 + Math.max(0, fontScale - 1) * 20 + insets.bottom;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2d6a4f',
                tabBarInactiveTintColor: '#999',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopColor: '#f0f0f0',
                    borderTopWidth: 1,
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 8),
                    height: tabBarHeight,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="home" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="fitness" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="insights"
                options={{
                    title: 'Insights',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="bulb" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <TabIcon name="person" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="checkin"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
        </Tabs>
    );
}