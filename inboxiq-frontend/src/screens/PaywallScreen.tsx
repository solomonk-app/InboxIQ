import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useColors } from "../hooks/useColors";
import { useSubscriptionStore } from "../hooks/useSubscriptionStore";
import { ThemeColors } from "../constants/theme";

const PRO_FEATURES = [
  { icon: "⚡", title: "Unlimited Digests", desc: "Generate as many digests as you need" },
  { icon: "📧", title: "Email Digest", desc: "Send AI-composed summary emails to your inbox" },
  { icon: "📅", title: "Auto Scheduling", desc: "Set up automatic daily, weekly, or monthly digests" },
  { icon: "🚀", title: "Priority Support", desc: "Get help when you need it" },
];

export default function PaywallScreen() {
  const navigation = useNavigation();
  const colors = useColors();
  const styles = createStyles(colors);
  const { currentOffering, purchase, restore, purchasing } = useSubscriptionStore();
  const [restoring, setRestoring] = useState(false);

  // Get price from the offering, fallback to default
  const priceString = currentOffering?.product?.priceString || "$4.99";

  const handleSubscribe = async () => {
    if (!currentOffering) {
      Alert.alert(
        "Not Available",
        "Subscriptions are not available in this build. Please use a production or TestFlight build to subscribe.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const success = await purchase();
      if (success) {
        Alert.alert("Welcome to Pro!", "You now have full access to all InboxIQ features.", [
          { text: "Let's go!", onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert("Purchase Failed", "Something went wrong. Please try again.", [{ text: "OK" }]);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restore();
      if (restored) {
        Alert.alert("Restored!", "Your Pro subscription has been restored.", [
          { text: "Great!", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("No Subscription Found", "We couldn't find an active subscription for your account.", [
          { text: "OK" },
        ]);
      }
    } catch {
      Alert.alert("Restore Failed", "Something went wrong. Please try again.", [{ text: "OK" }]);
    }
    setRestoring(false);
  };

  return (
    <View style={styles.container}>
      {/* Close button — outside ScrollView so it's always tappable */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>PRO</Text>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>
            Unlock the full power of InboxIQ
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{priceString}</Text>
          <Text style={styles.pricePeriod}>/month</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {PRO_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subscribe button */}
        <TouchableOpacity
          style={[styles.subscribeBtn, (purchasing || restoring) && styles.btnDisabled]}
          onPress={handleSubscribe}
          disabled={purchasing || restoring}
        >
          {purchasing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={purchasing || restoring}
        >
          {restoring ? (
            <ActivityIndicator color={colors.textSubtle} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          Payment will be charged to your {currentOffering ? "account" : "Apple ID or Google Play account"} at confirmation of purchase.
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

    closeBtn: {
      position: "absolute",
      top: 54,
      right: 24,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgCard,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    closeText: { fontSize: 16, color: colors.textMuted },

    header: { alignItems: "center", marginBottom: 24 },
    badge: {
      fontSize: 14,
      fontWeight: "800",
      color: "#ffffff",
      backgroundColor: colors.primaryDark,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16,
      letterSpacing: 2,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
    },

    priceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      marginBottom: 32,
    },
    price: { fontSize: 48, fontWeight: "800", color: colors.primary },
    pricePeriod: { fontSize: 16, color: colors.textSubtle, marginLeft: 4 },

    featuresList: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 4,
      marginBottom: 32,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    featureIcon: { fontSize: 24, marginRight: 14 },
    featureText: { flex: 1 },
    featureTitle: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    featureDesc: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },

    subscribeBtn: {
      backgroundColor: colors.primaryDark,
      borderRadius: 14,
      paddingVertical: 18,
      alignItems: "center",
      marginBottom: 12,
    },
    btnDisabled: { opacity: 0.6 },
    subscribeBtnText: { fontSize: 17, fontWeight: "700", color: "#ffffff" },

    restoreBtn: {
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 20,
    },
    restoreText: { fontSize: 14, fontWeight: "500", color: colors.textSubtle },

    terms: {
      fontSize: 10,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 15,
    },
  });
