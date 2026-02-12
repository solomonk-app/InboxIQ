import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { authAPI, API_URL } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";
import { useColors } from "../hooks/useColors";
import { useThemeStore } from "../hooks/useThemeStore";
import { ThemeColors } from "../constants/theme";

const { width } = Dimensions.get("window");

const FEATURES = [
  { icon: "🤖", text: "Gemini AI categorizes every email" },
  { icon: "📊", text: "Smart digests on your schedule" },
  { icon: "⚡", text: "Highlights & action items at a glance" },
];

// ─── Animated Logo ──────────────────────────────────────────────
function AnimatedLogo({ colors }: { colors: ThemeColors }) {
  const entrance = useSharedValue(0);
  const innerReveal = useSharedValue(0);
  const orbit = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const float = useSharedValue(0);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const dot4 = useSharedValue(0);

  useEffect(() => {
    // Outer shape scales in
    entrance.value = withSpring(1, { damping: 14, stiffness: 70 });

    // Inner content fades in after outer shape
    innerReveal.value = withDelay(400, withSpring(1, { damping: 16, stiffness: 90 }));

    // Orbiting dots rotate
    orbit.value = withDelay(
      600,
      withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false)
    );

    // Shimmer sweep
    shimmer.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 3000 }) // pause between shimmers
        ),
        -1,
        false
      )
    );

    // Gentle float
    float.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Staggered dot pulses
    [dot1, dot2, dot3, dot4].forEach((dot, i) => {
      dot.value = withDelay(
        800 + i * 300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    });
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entrance.value }, { translateY: float.value }],
    opacity: entrance.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: innerReveal.value,
    transform: [{ scale: interpolate(innerReveal.value, [0, 1], [0.6, 1]) }],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value}deg` }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.4, 0.6, 1], [0, 0.6, 0.6, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-60, 60]) },
      { rotate: "25deg" },
    ],
  }));

  const makeDotStyle = (dotVal: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: dotVal.value,
      transform: [{ scale: interpolate(dotVal.value, [0.3, 1], [0.5, 1]) }],
    }));

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const d1Style = makeDotStyle(dot1);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const d2Style = makeDotStyle(dot2);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const d3Style = makeDotStyle(dot3);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const d4Style = makeDotStyle(dot4);

  return (
    <Animated.View style={[logoStyles.wrapper, entranceStyle]}>
      {/* Orbiting dots */}
      <Animated.View style={[logoStyles.orbitRing, orbitStyle]}>
        <Animated.View style={[logoStyles.orbitDot, logoStyles.orbitDot1, { backgroundColor: colors.primary }, d1Style]} />
        <Animated.View style={[logoStyles.orbitDot, logoStyles.orbitDot2, { backgroundColor: colors.primary }, d2Style]} />
        <Animated.View style={[logoStyles.orbitDot, logoStyles.orbitDot3, { backgroundColor: colors.primary }, d3Style]} />
        <Animated.View style={[logoStyles.orbitDot, logoStyles.orbitDot4, { backgroundColor: colors.primary }, d4Style]} />
      </Animated.View>

      {/* Outer rounded square */}
      <View style={[logoStyles.outerShape, { backgroundColor: colors.primaryDark }]}>
        {/* Inner shape */}
        <View style={[logoStyles.innerShape, { backgroundColor: colors.primary }]}>
          {/* Shimmer sweep */}
          <Animated.View style={[logoStyles.shimmer, shimmerStyle]} />

          {/* IQ Monogram */}
          <Animated.View style={[logoStyles.monogramWrap, innerStyle]}>
            <Text style={logoStyles.monogramI}>I</Text>
            <Text style={logoStyles.monogramQ}>Q</Text>
          </Animated.View>
        </View>
      </View>

      {/* Glow underneath */}
      <View style={[logoStyles.glow, { backgroundColor: colors.primary }]} />
    </Animated.View>
  );
}

const logoStyles = StyleSheet.create({
  wrapper: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  outerShape: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#818cf8",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
  },
  innerShape: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    width: 24,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
  },
  monogramWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  monogramI: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -2,
  },
  monogramQ: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: -1,
  },
  glow: {
    position: "absolute",
    bottom: 10,
    width: 70,
    height: 20,
    borderRadius: 10,
    opacity: 0.2,
    transform: [{ scaleX: 1.5 }],
  },
  orbitRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  orbitDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orbitDot1: { top: 0, left: "50%", marginLeft: -4 },
  orbitDot2: { bottom: 0, left: "50%", marginLeft: -4 },
  orbitDot3: { left: 0, top: "50%", marginTop: -4 },
  orbitDot4: { right: 0, top: "50%", marginTop: -4 },
});

// ─── Main Screen ────────────────────────────────────────────────
export default function LoginScreen() {
  const { setAuth } = useAuthStore();
  const colors = useColors();
  const { resolvedMode } = useThemeStore();
  const styles = createStyles(colors);

  const brandFade = useSharedValue(0);
  const featureFades = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const buttonFade = useSharedValue(0);

  useEffect(() => {
    brandFade.value = withDelay(
      200,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) })
    );

    featureFades.forEach((f, i) => {
      f.value = withDelay(
        650 + i * 150,
        withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
      );
    });

    buttonFade.value = withDelay(
      1150,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );
  }, []);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandFade.value,
    transform: [{ translateY: interpolate(brandFade.value, [0, 1], [24, 0]) }],
  }));

  const featureStyles = featureFades.map((f) =>
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

  const handleGoogleSignIn = async () => {
    try {
      let resultUrl: string | null = null;

      if (__DEV__) {
        // DEV: Use Linking listener + external browser.
        const authPromise = new Promise<string | null>((resolve) => {
          const timeout = setTimeout(() => { sub.remove(); resolve(null); }, 120000);
          const handleUrl = (event: { url: string }) => {
            clearTimeout(timeout);
            sub.remove();
            resolve(event.url);
          };
          const sub = Linking.addEventListener("url", handleUrl);
        });

        // Use inboxiq:// for dev client builds, exp:// only for Expo Go
        const isExpoGo = Constants.appOwnership === "expo";
        const hostUri = Constants.expoConfig?.hostUri || "localhost:8081";
        const deepLink = isExpoGo
          ? btoa(`exp://${hostUri}`)
          : btoa("inboxiq://");
        const baseUrl = API_URL.replace(/\/api$/, "");
        const startUrl = `${baseUrl}/api/auth/google/start?deep_link=${encodeURIComponent(deepLink)}`;
        await Linking.openURL(startUrl);

        resultUrl = await authPromise;
      } else {
        // PRODUCTION: Use openAuthSessionAsync which detects the inboxiq:// redirect
        // and automatically closes the browser, returning the URL.
        // preferEphemeralSession prevents Safari from reusing cached sessions
        // which can break deep link detection on iPad.
        const { data } = await authAPI.getGoogleAuthUrl();
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          "inboxiq://auth",
          { preferEphemeralSession: true }
        );
        if (result.type === "success") {
          resultUrl = result.url;
        } else if (result.type === "cancel" || result.type === "dismiss") {
          // User cancelled — don't show an error
          return;
        }
      }

      if (resultUrl) {
        const params = Linking.parse(resultUrl);
        const token = params.queryParams?.token as string;
        const name = params.queryParams?.name as string;
        const email = params.queryParams?.email as string;
        if (token) {
          await setAuth(
            { id: "", email: email || "", name: name || "User", avatarUrl: "" },
            token
          );
        } else {
          Alert.alert("Sign In Error", "Authentication failed. Please try again.");
        }
      } else {
        Alert.alert("Sign In Error", "Sign-in was not completed. Please try again.");
      }
    } catch (error: any) {
      Alert.alert(
        "Sign In Error",
        `${error?.message || String(error)}\n\nCode: ${error?.code || "none"}\nName: ${error?.name || "unknown"}`
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert("Sign In Error", "No identity token received from Apple.");
        return;
      }

      const { data } = await authAPI.appleSignIn(
        credential.identityToken,
        credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? undefined,
              familyName: credential.fullName.familyName ?? undefined,
            }
          : null
      );

      await setAuth(
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || "User",
          avatarUrl: data.user.avatarUrl || "",
        },
        data.token
      );
    } catch (error: any) {
      // User cancelled the dialog — ignore silently
      if (error.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(
        "Sign In Error",
        `${error?.message || String(error)}\n\nCode: ${error?.code || "none"}\nName: ${error?.name || "unknown"}`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Ambient orbs */}
      <View style={styles.gradientOrb1} />
      <View style={styles.gradientOrb2} />
      <View style={styles.gradientOrb3} />

      {/* Branding */}
      <Animated.View style={[styles.brandSection, brandStyle]}>
        <AnimatedLogo colors={colors} />
        <Text style={styles.appName}>
          Inbox<Text style={styles.appNameAccent}>IQ</Text>
        </Text>
        <Text style={styles.tagline}>
          AI-powered inbox intelligence.{"\n"}Summarized. Categorized. Delivered.
        </Text>
      </Animated.View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <Animated.View key={i} style={[styles.featureRow, featureStyles[i]]}>
            <View style={styles.featureIconWrap}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Sign In */}
      <Animated.View style={buttonStyle}>
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>
      </Animated.View>

      {Platform.OS === "ios" && (
        <Animated.View style={[buttonStyle, { marginTop: 12 }]}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              resolvedMode === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={14}
            style={{ width: width - 64, height: 52 }}
            onPress={handleAppleSignIn}
          />
        </Animated.View>
      )}

      <Animated.View style={buttonStyle}>
        <Text style={styles.disclaimer}>
          We only request read access to your Gmail inbox.{"\n"}
          Your emails are never stored in full.
        </Text>
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
    gradientOrb1: {
      position: "absolute", top: -120, right: -60,
      width: 280, height: 280, borderRadius: 140,
      backgroundColor: colors.primaryBg, opacity: 0.8,
    },
    gradientOrb2: {
      position: "absolute", bottom: -80, left: -100,
      width: 250, height: 250, borderRadius: 125,
      backgroundColor: colors.primaryBg, opacity: 0.6,
    },
    gradientOrb3: {
      position: "absolute", top: "40%", left: -40,
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: colors.primaryBg, opacity: 0.4,
    },
    brandSection: { alignItems: "center", marginBottom: 44 },
    appName: {
      fontSize: 38, fontWeight: "800", color: colors.textPrimary, letterSpacing: -1,
    },
    appNameAccent: { color: colors.primary },
    tagline: {
      fontSize: 15, color: colors.textMuted, textAlign: "center",
      marginTop: 12, lineHeight: 22,
    },
    features: { width: "100%", marginBottom: 44, gap: 12 },
    featureRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.bgCard, borderRadius: 14,
      paddingVertical: 14, paddingHorizontal: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    featureIconWrap: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: colors.primaryBg,
      alignItems: "center", justifyContent: "center",
      marginRight: 14,
    },
    featureIcon: { fontSize: 18 },
    featureText: { fontSize: 14, color: colors.textTertiary, fontWeight: "500", flex: 1 },
    googleButton: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      backgroundColor: colors.googleButtonBg, width: width - 64,
      paddingVertical: 16, borderRadius: 14, gap: 12,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
    googleIcon: { fontSize: 20, fontWeight: "700", color: "#4285F4" },
    googleText: { fontSize: 16, fontWeight: "600", color: colors.googleButtonText },
    disclaimer: {
      fontSize: 11, color: colors.textSubtle, textAlign: "center",
      marginTop: 20, lineHeight: 16,
    },
  });
