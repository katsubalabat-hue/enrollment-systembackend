import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface LoadingStateProps {
  label?: string;
}

interface EmptyStateProps {
  title: string;
  message?: string;
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1D4ED8" />
      <Text style={styles.helperText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.helperText}>{message}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.helperText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  panel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },

  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  helperText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },

  retryButton: {
    minHeight: 40,
    marginTop: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
