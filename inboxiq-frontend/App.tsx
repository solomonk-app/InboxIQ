import React, { useEffect, useState, useCallback } from "react";
import { Appearance, View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";

// Keep native splash visible while we load
SplashScreen.preventAutoHideAsync();

import { useAuthStore } from "./src/hooks/useAuthStore";
import { useThemeStore } from "./src/hooks/useThemeStore";
import { useSubscriptionStore } from "./src/hooks/useSubscriptionStore";
import { useColors } from "./src/hooks/useColors";
import { AuthStack, AppStack } from "./src/navigation/AppNavigator";
import { initRevenueCat, getPurchasesModule } from "./src/config/revenuecat";

function SplashView({ colors, onLayout }: { colors: any; onLayout?: () => void }) {
  // Start fully visible — no entrance animation, just looping effects
  const logoGlow = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const orbit = useSharedValue(0);

  useEffect(() => {
    logoGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    shimmer.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 2500 })
        ),
        -1,
        false
      )
    );
    orbit.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logoGlow.value, [0, 1], [0.2, 0.5]),
    transform: [{ scale: interpolate(logoGlow.value, [0, 1], [1, 1.15]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.4, 0.6, 1], [0, 0.5, 0.5, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-50, 50]) },
      { rotate: "25deg" },
    ],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value}deg` }],
  }));

  return (
    <View style={[splash.container, { backgroundColor: colors.bg }]} onLayout={onLayout}>
      {/* Ambient orbs */}
      <View style={[splash.orb1, { backgroundColor: colors.primaryBg }]} />
      <View style={[splash.orb2, { backgroundColor: colors.primaryBg }]} />

      {/* Logo */}
      <View style={splash.logoWrap}>
        {/* Glow */}
        <Animated.View style={[splash.glow, { backgroundColor: colors.primary }, glowStyle]} />

        {/* Orbit dots */}
        <Animated.View style={[splash.orbitRing, orbitStyle]}>
          {[0, 90, 180, 270].map((angle, i) => (
            <View
              key={i}
              style={[
                splash.orbitDot,
                {
                  backgroundColor: colors.primary,
                  opacity: i % 2 === 0 ? 0.8 : 0.4,
                  top: angle === 0 ? 0 : angle === 180 ? undefined : "50%",
                  bottom: angle === 180 ? 0 : undefined,
                  left: angle === 270 ? 0 : angle === 90 ? undefined : "50%",
                  right: angle === 90 ? 0 : undefined,
                  marginLeft: angle === 0 || angle === 180 ? -4 : 0,
                  marginTop: angle === 90 || angle === 270 ? -4 : 0,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Outer shape */}
        <View style={[splash.outerShape, { backgroundColor: colors.primaryDark }]}>
          <View style={[splash.innerShape, { backgroundColor: colors.primary }]}>
            <Animated.View style={[splash.shimmer, shimmerStyle]} />
            <Text style={splash.monoI}>I</Text>
            <Text style={splash.monoQ}>Q</Text>
          </View>
        </View>
      </View>

      {/* App name */}
      <View style={splash.nameWrap}>
        <Text style={[splash.nameText, { color: colors.textPrimary }]}>
          Inbox<Text style={{ color: colors.primary }}>IQ</Text>
        </Text>
      </View>
    </View>
  );
}

const splash = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  orb1: {
    position: "absolute", top: -100, right: -50,
    width: 250, height: 250, borderRadius: 125, opacity: 0.7,
  },
  orb2: {
    position: "absolute", bottom: -60, left: -80,
    width: 200, height: 200, borderRadius: 100, opacity: 0.5,
  },
  logoWrap: {
    width: 140, height: 140,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  glow: {
    position: "absolute", width: 120, height: 120, borderRadius: 60, opacity: 0.2,
  },
  orbitRing: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
  },
  orbitDot: {
    position: "absolute", width: 7, height: 7, borderRadius: 3.5,
  },
  outerShape: {
    width: 90, height: 90, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#818cf8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 16,
  },
  innerShape: {
    width: 74, height: 74, borderRadius: 22,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute", width: 20, height: 100,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10,
  },
  monoI: { fontSize: 34, fontWeight: "900", color: "#ffffff", letterSpacing: -2 },
  monoQ: { fontSize: 26, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: -1 },
  nameWrap: { marginTop: 4 },
  nameText: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
});

export default function App() {
  const { isAuthenticated, isLoading, loadStoredAuth, user } = useAuthStore();
  const { loadStoredTheme, mode, statusBarStyle } = useThemeStore();
  const { loadSubscription } = useSubscriptionStore();
  const colors = useColors();
  const [splashDone, setSplashDone] = useState(false);
  const [nativeHidden, setNativeHidden] = useState(false);

  useEffect(() => {
    initRevenueCat();
    loadStoredAuth();
    loadStoredTheme();
    // Show animated splash for at least 2 seconds
    const timer = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hide native splash as soon as our animated splash mounts
  const onSplashLayout = useCallback(async () => {
    if (!nativeHidden) {
      setNativeHidden(true);
      await SplashScreen.hideAsync();
    }
  }, [nativeHidden]);

  // Identify user with RevenueCat and load subscription once authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      getPurchasesModule().then((Purchases) => {
        if (Purchases) Purchases.logIn(user.id).catch(() => {});
      });
      loadSubscription();
    }
  }, [isAuthenticated, user?.id]);

  // Listen for system appearance changes when in "system" mode
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      const { mode: currentMode, setMode } = useThemeStore.getState();
      if (currentMode === "system") {
        setMode("system");
      }
    });
    return () => subscription.remove();
  }, []);

  if (isLoading || !splashDone) {
    return <SplashView colors={colors} onLayout={onSplashLayout} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={statusBarStyle} />
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
