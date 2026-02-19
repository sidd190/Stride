import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { colors } from "@/constants/theme";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary[500],
                tabBarInactiveTintColor: colors.text.tertiary,
                tabBarStyle: {
                    backgroundColor: colors.background.secondary,
                    borderTopWidth: 1,
                    borderTopColor: colors.border.subtle,
                    height: Platform.OS === "ios" ? 88 : 100,
                    paddingTop: 12,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.background.secondary,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.subtle,
                },
                headerTintColor: colors.text.primary,
                headerTitleStyle: {
                    fontWeight: "bold",
                    fontSize: 18,
                },
            }}
        >
            <Tabs.Screen 
                name="home" 
                options={{ 
                    title: "Home",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "home" : "home-outline"} 
                            size={size} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="race" 
                options={{ 
                    title: "Race",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "flag" : "flag-outline"} 
                            size={size} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="record" 
                options={{ 
                    title: "Record",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "radio-button-on" : "radio-button-off"} 
                            size={size + 4} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="leaderboard" 
                options={{ 
                    title: "Leaderboard",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "trophy" : "trophy-outline"} 
                            size={size} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="profile" 
                options={{ 
                    title: "Profile",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "person" : "person-outline"} 
                            size={size} 
                            color={color} 
                        />
                    ),
                }}
            />
        </Tabs>
    )
}