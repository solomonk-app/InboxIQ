import React from "react";
import { Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import LoginScreen from "../screens/LoginScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import DashboardScreen from "../screens/DashboardScreen";
import CategoryScreen from "../screens/CategoryScreen";
import DigestScreen from "../screens/DigestScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PaywallScreen from "../screens/PaywallScreen";
import { useColors } from "../hooks/useColors";
import { useAuthStore } from "../hooks/useAuthStore";
import { RootStackParamList, MainTabParamList } from "../types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: "📩",
  Digest: "📄",
  Settings: "⚙️",
};

// ─── Bottom Tab Navigator ────────────────────────────────────────
export function MainTabs() {
  const colors = useColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.tabBarBorder,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, focused }) => (
          <View style={{ alignItems: "center", justifyContent: "center", width: 60 }}>
            <Text style={{ fontSize: 22 }}>{TAB_ICONS[route.name]}</Text>
            <Text style={{ fontSize: 10, fontWeight: focused ? "700" : "500", color, marginTop: 4 }} numberOfLines={1}>
              {route.name === "Dashboard" ? "Inbox" : route.name}
            </Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Digest" component={DigestScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ────────────────────────────────────────
export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export function AppStack() {
  const colors = useColors();
  const { isNewLogin } = useAuthStore();

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isNewLogin ? "Welcome" : "Main"}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTintColor: colors.textPrimary,
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
