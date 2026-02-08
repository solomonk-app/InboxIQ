import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { digestsAPI } from "../services/api";
import { useColors } from "../hooks/useColors";
import { ThemeColors, CATEGORY_ICONS } from "../constants/theme";
import { formatDigestDate, capitalize } from "../utils/formatting";
import LoadingModal from "../components/LoadingModal";
import { Digest } from "../types";

export default function DigestScreen() {
  const colors = useColors();
  const styles = createStyles(colors);

  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const loadDigest = async () => {
    try {
      const { data } = await digestsAPI.getLatest();
      setDigest(data.digest);
    } catch {
      setDigest(null);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setCheckedItems(new Set());
      loadDigest();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setCheckedItems(new Set());
    await loadDigest();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!digest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No digest yet</Text>
        <Text style={styles.emptyText}>
          Generate your first digest from the Dashboard
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <LoadingModal visible={refreshing} message="Refreshing digest..." />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Digest</Text>
        <Text style={styles.date}>{formatDigestDate(digest.generated_at)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>{digest.total_emails} emails</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.warningBg }]}>
            <Text style={[styles.statPillText, { color: colors.warning }]}>
              {digest.unread_count} unread
            </Text>
          </View>
        </View>
      </View>

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Highlights</Text>
          {digest.highlights.map((h, i) => (
            <View key={i} style={styles.highlightItem}>
              <Text style={styles.highlightBullet}>•</Text>
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Items */}
      {digest.action_items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Items</Text>
          {digest.action_items.map((item, i) => (
            <TouchableOpacity key={i} style={styles.actionItem} onPress={() => toggleItem(i)}>
              <View style={[styles.checkbox, checkedItems.has(i) && styles.checkboxChecked]}>
                {checkedItems.has(i) && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.actionText, checkedItems.has(i) && styles.actionTextChecked]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Category</Text>
        {digest.categories.map((cat, i) => (
          <View key={i} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryIcon}>
                {CATEGORY_ICONS[cat.category] || "📧"}
              </Text>
              <Text style={styles.categoryName}>{capitalize(cat.category)}</Text>
              <View style={styles.categoryCountBadge}>
                <Text style={styles.categoryCountText}>{cat.count}</Text>
              </View>
            </View>
            <Text style={styles.categorySummary}>{cat.summary}</Text>

            {cat.topEmails?.slice(0, 3).map((email, j) => (
              <View key={j} style={styles.topEmail}>
                <Text style={styles.topEmailFrom}>{email.from}</Text>
                <Text style={styles.topEmailSubject} numberOfLines={1}>
                  {email.subject}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textSecondary },
    emptyText: { fontSize: 14, color: colors.textSubtle, marginTop: 8 },

    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
    date: { fontSize: 13, color: colors.textSubtle, marginTop: 6 },
    statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
    statPill: { backgroundColor: colors.primaryBg, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    statPillText: { fontSize: 12, fontWeight: "600", color: colors.primary },

    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textSecondary, marginBottom: 14 },

    highlightItem: { flexDirection: "row", marginBottom: 10, paddingRight: 12 },
    highlightBullet: { color: colors.primary, fontSize: 16, marginRight: 10, marginTop: -1 },
    highlightText: { fontSize: 14, color: colors.textTertiary, lineHeight: 20, flex: 1 },

    actionItem: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.actionItemBg,
      borderRadius: 10, padding: 14, marginBottom: 8,
    },
    checkbox: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, borderColor: colors.danger, marginRight: 12,
      justifyContent: "center", alignItems: "center",
    },
    checkboxChecked: {
      backgroundColor: colors.success, borderColor: colors.success,
    },
    checkmark: { color: colors.checkmark, fontSize: 13, fontWeight: "700" },
    actionText: { fontSize: 13, color: colors.textTertiary, flex: 1 },
    actionTextChecked: {
      textDecorationLine: "line-through", color: colors.textSubtle,
    },

    categorySection: {
      backgroundColor: colors.bgCard,
      borderRadius: 14, padding: 16, marginBottom: 12,
    },
    categoryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    categoryIcon: { fontSize: 20, marginRight: 10 },
    categoryName: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, flex: 1 },
    categoryCountBadge: {
      backgroundColor: colors.primaryBg,
      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    },
    categoryCountText: { fontSize: 12, fontWeight: "700", color: colors.primary },
    categorySummary: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 12 },

    topEmail: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
    topEmailFrom: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    topEmailSubject: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  });
