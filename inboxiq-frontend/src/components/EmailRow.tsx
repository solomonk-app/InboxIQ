import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { StoredEmail } from "../types";
import { useColors } from "../hooks/useColors";
import { PRIORITY_COLORS, ThemeColors } from "../constants/theme";

interface Props {
  email: StoredEmail;
  onPress?: () => void;
}

export default function EmailRow({ email, onPress }: Props) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.card, !email.is_read && styles.unreadCard]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {!email.is_read && <View style={styles.accentStrip} />}
      <View
        style={[
          styles.priorityDot,
          { backgroundColor: PRIORITY_COLORS[email.priority] || PRIORITY_COLORS.medium },
        ]}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.from} numberOfLines={1}>
            {email.from_name || email.from_email}
          </Text>
          {email.action_required && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>Action</Text>
            </View>
          )}
        </View>
        <Text style={styles.subject} numberOfLines={1}>
          {email.subject}
        </Text>
        <Text style={styles.summary}>
          {email.ai_summary}
        </Text>
        <Text style={styles.date}>
          {new Date(email.email_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      backgroundColor: colors.bgCard,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      overflow: "hidden",
    },
    unreadCard: {
      backgroundColor: colors.unreadBg,
    },
    accentStrip: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.primary,
      borderTopLeftRadius: 14,
      borderBottomLeftRadius: 14,
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginRight: 12,
    },
    content: { flex: 1 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    from: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, flex: 1 },
    subject: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginBottom: 6 },
    summary: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 6 },
    date: { fontSize: 11, color: colors.textSubtle },
    actionBadge: {
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    actionBadgeText: { fontSize: 10, fontWeight: "600", color: colors.danger },
  });
