import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../hooks/useAuthStore";
import { useColors } from "../hooks/useColors";
import { ThemeColors } from "../constants/theme";
import { RootStackParamList } from "../types";

const { width } = Dimensions.get("window");

type Nav = NativeStackNavigationProp<RootStackParamList, "Welcome">;

const STEPS = [
  {
    icon: "📬",
    title: "Connect Gmail",
    desc: "Your inbox is securely linked via Google OAuth",
  },
  {
    icon: "🤖",
    title: "AI Categorizes",
    desc: "Gemini AI sorts every email into smart categories",
  },
  {
    icon: "📊",
    title: "Get Your Digest",
    desc: "Receive highlights, action items & summaries",
  },
];

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, clearNewLogin } = useAuthStore();
  const colors = useColors();
  const styles = createStyles(colors);

  const headerFade = useSharedValue(0);
  const stepFades = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const buttonFade = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    // Success checkmark
    checkScale.value = withSpring(1, { damping: 10, stiffness: 80 });

    // Header fades in
    headerFade.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
    );

    // Steps stagger in
    stepFades.forEach((f, i) => {
      f.value = withDelay(
        600 + i * 200,
        withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
      );
    });

    // Button fades in
    buttonFade.value = withDelay(
      1300,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );

    // Gentle pulse on the checkmark
    pulse.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.35]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.3]) }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerFade.value,
    transform: [{ translateY: interpolate(headerFade.value, [0, 1], [20, 0]) }],
  }));

  const stepStyles = stepFades.map((f) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      opacity: f.value,
      transform: [{ translateY: interpolate(f.value, [0, 1], [16, 0]) }],
    }))
  );

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonFade.value,
    transform: [{ translateY: interpolate(buttonFade.value, [0, 1], [12, 0]) }],
  }));

  const handleGetStarted = () => {
    clearNewLogin();
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <View style={styles.container}>
      {/* Ambient orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Success checkmark */}
      <View style={styles.checkWrap}>
        <Animated.View style={[styles.checkPulse, { backgroundColor: colors.primary }, pulseStyle]} />
        <Animated.View style={[styles.checkCircle, { backgroundColor: colors.primary }, checkStyle]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>
      </View>

      {/* Header */}
      <Animated.View style={[styles.headerWrap, headerStyle]}>
        <Text style={styles.welcomeText}>Welcome, {firstName}!</Text>
        <Text style={styles.subtitle}>
          Your account is ready. Here's how InboxIQ works:
        </Text>
      </Animated.View>

      {/* Steps */}
      <View style={styles.stepsWrap}>
        {STEPS.map((step, i) => (
          <Animated.View key={i} style={[styles.stepRow, stepStyles[i]]}>
            <View style={styles.stepLeft}>
              <View style={styles.stepNumberWrap}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              {i < STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Get Started button */}
      <Animated.View style={buttonStyle}>
        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
          <Text style={styles.buttonArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    orb1: {
      position: "absolute", top: -100, right: -60,
      width: 260, height: 260, borderRadius: 130,
      backgroundColor: colors.primaryBg, opacity: 0.8,
    },
    orb2: {
      position: "absolute", bottom: -80, left: -100,
      width: 220, height: 220, borderRadius: 110,
      backgroundColor: colors.primaryBg, opacity: 0.5,
    },
    checkWrap: {
      width: 80, height: 80,
      alignItems: "center", justifyContent: "center",
      marginBottom: 24,
    },
    checkPulse: {
      position: "absolute",
      width: 80, height: 80, borderRadius: 40,
    },
    checkCircle: {
      width: 64, height: 64, borderRadius: 32,
      alignItems: "center", justifyContent: "center",
      shadowColor: "#818cf8",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
    },
    checkIcon: {
      fontSize: 30, fontWeight: "800", color: "#ffffff",
    },
    headerWrap: {
      alignItems: "center", marginBottom: 36,
    },
    welcomeText: {
      fontSize: 28, fontWeight: "800", color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15, color: colors.textMuted, textAlign: "center",
      marginTop: 10, lineHeight: 22,
    },
    stepsWrap: {
      width: "100%", marginBottom: 40,
    },
    stepRow: {
      flexDirection: "row", minHeight: 72,
    },
    stepLeft: {
      width: 32, alignItems: "center",
    },
    stepNumberWrap: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.primaryBg,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1.5, borderColor: colors.primary,
    },
    stepNumber: {
      fontSize: 13, fontWeight: "700", color: colors.primary,
    },
    stepLine: {
      flex: 1, width: 2, backgroundColor: colors.border,
      marginVertical: 4,
    },
    stepContent: {
      flex: 1, flexDirection: "row", alignItems: "center",
      marginLeft: 14,
      backgroundColor: colors.bgCard,
      borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      paddingVertical: 14, paddingHorizontal: 14,
      marginBottom: 10,
    },
    stepIconWrap: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: colors.primaryBg,
      alignItems: "center", justifyContent: "center",
      marginRight: 12,
    },
    stepIcon: { fontSize: 20 },
    stepTextWrap: { flex: 1 },
    stepTitle: {
      fontSize: 15, fontWeight: "700", color: colors.textPrimary,
    },
    stepDesc: {
      fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18,
    },
    button: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      backgroundColor: colors.primary, width: width - 64,
      paddingVertical: 16, borderRadius: 14, gap: 8,
      shadowColor: "#818cf8",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },
    buttonText: {
      fontSize: 17, fontWeight: "700", color: "#ffffff",
    },
    buttonArrow: {
      fontSize: 18, fontWeight: "600", color: "rgba(255,255,255,0.8)",
    },
  });
