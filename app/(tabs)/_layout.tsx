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
                    height: Platform.OS === "ios" ? 88 : 70,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === "ios" ? 32 : 8,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "500",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen 
                name="home" 
                options={{ 
                    title: "Home",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "home" : "home-outline"} 
                            size={20} 
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
                            size={20} 
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
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="leaderboard" 
                options={{ 
                    title: "Ranks",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "trophy" : "trophy-outline"} 
                            size={20} 
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
                            size={20} 
                            color={color} 
                        />
                    ),
                }}
            />
        </Tabs>
    )
}