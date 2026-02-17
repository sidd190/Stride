import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#4e187aff",
                tabBarInactiveTintColor: "#8E8E93",
                tabBarStyle: {
                    backgroundColor: "#ffffff",
                    borderTopWidth: 1,
                    borderTopColor: "#E5E5EA",
                    height: Platform.OS === "ios" ? 88 : 100,
                    // paddingBottom: Platform.OS === "ios" ? 24 : 24,
                    paddingTop: 12,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                headerShown: true,
                headerStyle: {
                    backgroundColor: "#ffffff",
                },
                headerTintColor: "#000000",
                headerTitleStyle: {
                    fontWeight: "bold",
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
                name="maps" 
                options={{ 
                    title: "Maps",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "map" : "map-outline"} 
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