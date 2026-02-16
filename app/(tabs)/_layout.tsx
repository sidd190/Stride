import { Tabs } from "expo-router";

export default function TabLayout() {
    return (
        <Tabs>
            <Tabs.Screen name="home" options={{ title: "Home"}}/>
            <Tabs.Screen name="workout" options={{ title: "Workout"}}/>
            <Tabs.Screen name="profile" options={{ title: "Profile"}}/>
            <Tabs.Screen name="leaderboard" options={{ title: "Leaderboard"}}/>
        </Tabs>
    )
}