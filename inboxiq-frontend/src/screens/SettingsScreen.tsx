import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { settingsAPI } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";
import { useThemeStore, ThemeMode } from "../hooks/useThemeStore";
import { useSubscriptionStore } from "../hooks/useSubscriptionStore";
import { useColors } from "../hooks/useColors";
import { ThemeColors, FREQUENCIES, DELIVERY_TIMES } from "../constants/theme";
import { formatTime } from "../utils/formatting";

const THEME_OPTIONS: { key: ThemeMode; label: string; desc: string }[] = [
  { key: "light", label: "Light", desc: "Always light theme" },
  { key: "dark", label: "Dark", desc: "Always dark theme" },
  { key: "system", label: "System", desc: "Follow device setting" },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const { isPro, tier, canSchedule, trialActive, trialDaysRemaining } = useSubscriptionStore();
  const colors = useColors();
  const styles = createStyles(colors);

  const [frequency, setFrequency] = useState("daily");
  const [deliveryTime, setDeliveryTime] = useState("08:00");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.getSchedule();
      if (data.schedule) {
        setFrequency(data.schedule.frequency);
        setDeliveryTime(data.schedule.delivery_time);
        setIsActive(data.schedule.is_active);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const saveSettings = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      await settingsAPI.updateSchedule(updates);
    } catch {
      Alert.alert("Error", "Failed to save settings. Please try again.");
    }
    setSaving(false);
  };

  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq);
    saveSettings({ frequency: freq });
  };

  const handleTimeChange = (time: string) => {
    setDeliveryTime(time);
    saveSettings({ delivery_time: time });
  };

  const handleToggle = (value: boolean) => {
    setIsActive(value);
    saveSettings({ is_active: value });
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <View style={styles.powerIcon}>
            <View style={styles.powerRing} />
            <View style={styles.powerLine} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || "User"}</Text>
              <Text style={styles.profileEmail}>
                {user?.email || "Connected with Google"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          {THEME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.freqOption, themeMode === option.key && styles.freqOptionActive]}
              onPress={() => setThemeMode(option.key)}
            >
              <View style={styles.freqRadio}>
                {themeMode === option.key && <View style={styles.freqRadioInner} />}
              </View>
              <View style={styles.freqText}>
                <Text style={[styles.freqLabel, themeMode === option.key && styles.freqLabelActive]}>
                  {option.label}
                </Text>
                <Text style={styles.freqDesc}>{option.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        <View style={styles.card}>
          <View style={styles.subscriptionRow}>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Current Plan</Text>
              <View style={[styles.tierBadge, isPro && styles.tierBadgePro]}>
                <Text style={[styles.tierBadgeText, isPro && styles.tierBadgeTextPro]}>
                  {isPro ? "PRO" : trialActive ? "FREE TRIAL" : "FREE (EXPIRED)"}
                </Text>
              </View>
            </View>
            {!isPro && trialActive && (
              <Text style={styles.trialDaysText}>
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining
              </Text>
            )}
            {!isPro && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate("Paywall")}
              >
                <Text style={styles.upgradeBtnText}>
                  {trialActive ? "Upgrade to Pro" : "Subscribe to Continue"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Digest Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DIGEST</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Auto Digest</Text>
              <Text style={styles.toggleDesc}>
                {canSchedule ? "Receive AI summaries on schedule" : "Pro feature — upgrade to enable"}
              </Text>
            </View>
            <Switch
              value={canSchedule ? isActive : false}
              onValueChange={canSchedule ? handleToggle : () => navigation.navigate("Paywall")}
              trackColor={{ false: colors.switchTrackFalse, true: colors.primaryDark }}
              thumbColor={canSchedule && isActive ? colors.primary : colors.textMuted}
              disabled={!canSchedule}
            />
          </View>
        </View>
      </View>

      {/* Frequency */}
      <View style={[styles.section, !canSchedule && styles.lockedSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>FREQUENCY</Text>
          {!canSchedule && <Text style={styles.lockIcon}>🔒</Text>}
        </View>
        <View style={styles.card}>
          {FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.key}
              style={[styles.freqOption, frequency === freq.key && styles.freqOptionActive]}
              onPress={() => canSchedule ? handleFrequencyChange(freq.key) : navigation.navigate("Paywall")}
            >
              <View style={styles.freqRadio}>
                {frequency === freq.key && <View style={styles.freqRadioInner} />}
              </View>
              <View style={styles.freqText}>
                <Text style={[styles.freqLabel, frequency === freq.key && styles.freqLabelActive]}>
                  {freq.label}
                </Text>
                <Text style={styles.freqDesc}>{freq.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Delivery Time */}
      <View style={[styles.section, !canSchedule && styles.lockedSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>DELIVERY TIME</Text>
          {!canSchedule && <Text style={styles.lockIcon}>🔒</Text>}
        </View>
        <View style={styles.card}>
          <View style={styles.timeGrid}>
            {DELIVERY_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.timeChip, deliveryTime === time && styles.timeChipActive]}
                onPress={() => canSchedule ? handleTimeChange(time) : navigation.navigate("Paywall")}
              >
                <Text
                  style={[styles.timeChipText, deliveryTime === time && styles.timeChipTextActive]}
                >
                  {formatTime(time)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>InboxIQ v1.0.0 • Powered by Gemini AI</Text>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    header: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", marginBottom: 32,
    },
    title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
    logoutIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.dangerBg,
      justifyContent: "center", alignItems: "center",
    },
    powerIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
    powerRing: {
      width: 18, height: 18, borderRadius: 9,
      borderWidth: 2.5, borderColor: colors.danger,
      borderTopColor: "transparent",
    },
    powerLine: {
      position: "absolute", top: 0,
      width: 2.5, height: 10, backgroundColor: colors.danger, borderRadius: 2,
    },

    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    sectionLabel: {
      fontSize: 11, fontWeight: "700", color: colors.textSubtle,
      letterSpacing: 1.2, marginBottom: 10, marginLeft: 4,
    },
    lockIcon: { fontSize: 11, marginLeft: 6 },
    lockedSection: { opacity: 0.6 },
    card: { backgroundColor: colors.bgCard, borderRadius: 16, overflow: "hidden" },

    subscriptionRow: { padding: 16 },
    subscriptionInfo: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
    },
    subscriptionLabel: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    tierBadge: {
      backgroundColor: colors.bgCardHover, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
    },
    tierBadgePro: { backgroundColor: colors.primaryDark },
    tierBadgeText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1 },
    tierBadgeTextPro: { color: "#ffffff" },
    trialDaysText: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
    upgradeBtn: {
      backgroundColor: colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center",
    },
    upgradeBtnText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },

    profileRow: { flexDirection: "row", alignItems: "center", padding: 16 },
    avatar: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.primaryDark,
      justifyContent: "center", alignItems: "center", marginRight: 14,
    },
    avatarText: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    profileEmail: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },

    toggleRow: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", padding: 16,
    },
    toggleLabel: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    toggleDesc: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },

    freqOption: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    freqOptionActive: { backgroundColor: colors.freqOptionActiveBg },
    freqRadio: {
      width: 20, height: 20, borderRadius: 10,
      borderWidth: 2, borderColor: colors.textSubtle,
      justifyContent: "center", alignItems: "center", marginRight: 14,
    },
    freqRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    freqText: { flex: 1 },
    freqLabel: { fontSize: 14, fontWeight: "500", color: colors.textTertiary },
    freqLabelActive: { color: colors.primary, fontWeight: "600" },
    freqDesc: { fontSize: 11, color: colors.textSubtle, marginTop: 2 },

    timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16 },
    timeChip: {
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 10, backgroundColor: colors.bgCard,
    },
    timeChipActive: { backgroundColor: colors.primaryDark },
    timeChipText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    timeChipTextActive: { color: "#ffffff", fontWeight: "600" },

    logoutButton: {
      backgroundColor: colors.dangerBg,
      borderRadius: 14, paddingVertical: 16,
      alignItems: "center", marginTop: 12,
    },
    logoutText: { fontSize: 15, fontWeight: "600", color: colors.danger },
    version: { fontSize: 11, color: colors.textDim, textAlign: "center", marginTop: 24 },
  });
