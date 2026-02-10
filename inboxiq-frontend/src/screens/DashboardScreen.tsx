import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { emailsAPI, digestsAPI, settingsAPI } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";
import { useThemeStore } from "../hooks/useThemeStore";
import { useSubscriptionStore } from "../hooks/useSubscriptionStore";
import { useColors } from "../hooks/useColors";
import { ThemeColors } from "../constants/theme";
import { getGreeting } from "../utils/formatting";
import CategoryCard from "../components/CategoryCard";
import LoadingModal from "../components/LoadingModal";
import { EmailStats } from "../types";

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const categories = useThemeStore((s) => s.categories);
  const { isPro, digestsToday, maxDigests, canSendEmail, refreshUsage, trialActive, trialDaysRemaining } = useSubscriptionStore();
  const colors = useColors();
  const styles = createStyles(colors);

  const [stats, setStats] = useState<EmailStats>({ total: 0, unread: 0, actionRequired: 0 });
  const [frequency, setFrequency] = useState("daily");
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await emailsAPI.getStats();
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchFrequency = useCallback(async () => {
    try {
      const { data } = await settingsAPI.getSchedule();
      if (data.schedule?.frequency) {
        setFrequency(data.schedule.frequency);
      }
    } catch (err) {
      console.error("Failed to fetch frequency:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchFrequency();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleGenerateDigest = async () => {
    // Block if trial expired for free users
    if (!isPro && !trialActive) {
      navigation.navigate("Paywall" as any);
      return;
    }
    // Check quota for free tier
    if (!isPro && digestsToday >= maxDigests) {
      navigation.navigate("Paywall" as any);
      return;
    }

    setGenerating(true);
    try {
      const { data } = await digestsAPI.generate(frequency);
      // Refresh stats from the updated email_categories table
      await fetchStats();
      await refreshUsage();

      if (data.digest?.totalEmails === 0) {
        Alert.alert("No New Emails", "No new emails found for this period.");
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        navigation.navigate("Paywall" as any);
      } else {
        console.error("Failed to generate:", err);
        Alert.alert("Error", "Failed to generate digest. Please try again.");
      }
    }
    setGenerating(false);
  };

  const handleSendDigestEmail = async () => {
    if (!canSendEmail) {
      navigation.navigate("Paywall" as any);
      return;
    }

    setSendingEmail(true);
    try {
      const { data } = await digestsAPI.sendEmail();
      Alert.alert("Sent!", data.message);
    } catch (err: any) {
      if (err.response?.status === 403) {
        navigation.navigate("Paywall" as any);
      } else {
        console.error("Failed to send email:", err);
        Alert.alert("Error", "Failed to send digest email. Try again.");
      }
    }
    setSendingEmail(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <LoadingModal visible={generating} message="Generating digest..." />
      <LoadingModal visible={sendingEmail} message="Sending digest email..." />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0] || "there"} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleGenerateDigest}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.refreshIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate("Category", { category: "all", label: "All Emails" })}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statChevron}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statItem, styles.statDivider]} onPress={() => navigation.navigate("Category", { category: "all", label: "Unread", filter: "unread" })}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.unread}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Unread</Text>
            <Text style={styles.statChevron}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate("Category", { category: "all", label: "Action Required", filter: "action_required" })}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>{stats.actionRequired}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Action</Text>
            <Text style={styles.statChevron}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Usage / Trial Indicator (Free tier) */}
      {!isPro && (
        <View style={styles.usageBanner}>
          {trialActive ? (
            <>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>Free Trial - {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left</Text>
                <Text style={styles.usageCount}>
                  {digestsToday}/{maxDigests}
                </Text>
              </View>
              <View style={styles.usageBarBg}>
                <View
                  style={[
                    styles.usageBarFill,
                    { width: `${maxDigests > 0 ? Math.min((digestsToday / maxDigests) * 100, 100) : 0}%` },
                    digestsToday >= maxDigests && { backgroundColor: colors.danger },
                  ]}
                />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("Paywall" as any)}>
                <Text style={styles.upgradeLink}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.trialExpiredTitle}>Your free trial has ended</Text>
              <Text style={styles.trialExpiredDesc}>Upgrade to Pro to continue generating digests</Text>
              <TouchableOpacity
                style={styles.trialUpgradeBtn}
                onPress={() => navigation.navigate("Paywall" as any)}
              >
                <Text style={styles.trialUpgradeBtnText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Category Cards */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.key}
            category={cat}
            count={stats[cat.key] || 0}
            onPress={() =>
              navigation.navigate("Category", { category: cat.key, label: cat.label })
            }
          />
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleGenerateDigest}
        disabled={generating}
      >
        <Text style={styles.actionIcon}>⚡</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Generate Digest Now</Text>
          <Text style={styles.actionDesc}>AI-summarize your latest emails instantly</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleSendDigestEmail}
        disabled={sendingEmail}
      >
        <Text style={styles.actionIcon}>📧</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Send Digest Email</Text>
          <Text style={styles.actionDesc}>AI-compose & email your inbox summary</Text>
        </View>
        {!canSendEmail ? (
          <View style={styles.lockBadge}><Text style={styles.lockBadgeText}>PRO</Text></View>
        ) : (
          <Text style={styles.actionArrow}>→</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate("Settings")}
      >
        <Text style={styles.actionIcon}>📅</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Schedule Settings</Text>
          <Text style={styles.actionDesc}>Configure daily, weekly, or monthly digests</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
    greeting: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
    userName: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, marginTop: 2 },
    refreshBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primaryBg,
      justifyContent: "center", alignItems: "center",
    },
    refreshIcon: { fontSize: 20 },

    statsBanner: {
      flexDirection: "row", backgroundColor: colors.bgCard,
      borderRadius: 16, paddingVertical: 20, marginBottom: 32,
    },
    statItem: { flex: 1, alignItems: "center" },
    statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    statNumber: { fontSize: 28, fontWeight: "800", color: colors.primary },
    statLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: "500" },
    statLabelRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 2 },
    statChevron: { fontSize: 18, color: colors.textDim },

    sectionTitle: {
      fontSize: 16, fontWeight: "700", color: colors.textSecondary,
      marginBottom: 16, letterSpacing: 0.3,
    },

    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },

    usageBanner: {
      backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 16, marginTop: -12,
    },
    usageInfo: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
    },
    usageLabel: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    usageCount: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    usageBarBg: {
      height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden", marginBottom: 10,
    },
    usageBarFill: {
      height: 6, backgroundColor: colors.primary, borderRadius: 3,
    },
    upgradeLink: { fontSize: 13, fontWeight: "600", color: colors.primary },
    trialExpiredTitle: { fontSize: 15, fontWeight: "700", color: colors.danger, marginBottom: 4 },
    trialExpiredDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
    trialUpgradeBtn: {
      backgroundColor: colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center",
    },
    trialUpgradeBtnText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },

    actionCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 12,
    },
    actionIcon: { fontSize: 24, marginRight: 14 },
    actionText: { flex: 1 },
    actionTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    actionDesc: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
    actionArrow: { fontSize: 18, color: colors.textSubtle },
    lockBadge: {
      backgroundColor: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    lockBadgeText: { fontSize: 10, fontWeight: "700", color: "#ffffff", letterSpacing: 1 },
  });
