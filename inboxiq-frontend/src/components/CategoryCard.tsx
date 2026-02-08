import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useColors } from "../hooks/useColors";
import { CategoryDef, ThemeColors } from "../constants/theme";

interface Props {
  category: CategoryDef;
  count: number;
  onPress: () => void;
}

export default function CategoryCard({ category, count, onPress }: Props) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: category.bg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{category.icon}</Text>
      <Text style={styles.label}>{category.label}</Text>
      <Text style={[styles.count, { color: category.color }]}>{count}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: "47.5%",
      borderRadius: 16,
      padding: 18,
      minHeight: 100,
    },
    icon: { fontSize: 28, marginBottom: 10 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    count: { fontSize: 22, fontWeight: "800", marginTop: 6 },
  });
