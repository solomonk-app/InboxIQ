import React from "react";
import { Modal, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "../hooks/useColors";
import { ThemeColors } from "../constants/theme";

interface LoadingModalProps {
  visible: boolean;
  message?: string;
}

export default function LoadingModal({ visible, message = "Loading..." }: LoadingModalProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      paddingVertical: 32,
      paddingHorizontal: 40,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    message: {
      marginTop: 16,
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
    },
  });
