import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { emailsAPI } from "../services/api";
import { useColors } from "../hooks/useColors";
import { ThemeColors } from "../constants/theme";
import EmailRow from "../components/EmailRow";
import { StoredEmail } from "../types";

export default function CategoryScreen() {
  const route = useRoute<any>();
  const { category, label, filter } = route.params;
  const colors = useColors();
  const styles = createStyles(colors);

  const [emails, setEmails] = useState<StoredEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmails();
  }, [category]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const { data } = await emailsAPI.getEmails(category, 50, filter);
      setEmails(data.emails);
    } catch (err) {
      console.error("Failed to load emails:", err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading {label} emails...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.count}>{emails.length} emails</Text>
      </View>

      {emails.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No {label.toLowerCase()} emails found</Text>
          <Text style={styles.emptySubtext}>
            Generate a digest to categorize your latest inbox
          </Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EmailRow email={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loadingContainer: {
      flex: 1, backgroundColor: colors.bg,
      justifyContent: "center", alignItems: "center",
    },
    loadingText: { color: colors.textSubtle, marginTop: 12, fontSize: 14 },

    headerBar: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
    count: { fontSize: 13, color: colors.textSubtle, fontWeight: "500" },

    list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

    emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: "600", color: colors.textTertiary },
    emptySubtext: {
      fontSize: 13, color: colors.textSubtle, marginTop: 8,
      textAlign: "center", paddingHorizontal: 40,
    },
  });
