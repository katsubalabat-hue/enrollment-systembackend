import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";

import { useRouter } from "expo-router";

import { getAllPages } from "../../src/api/api";
import { tokenStorage } from "../../src/api/storage";

interface Enrollment {
  id: number;
  student_name: string;
  subject_name: string;
  section_name?: string;
  status: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [data, setData] = useState<Enrollment[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ───────────────────────────────────────────── */
  /* Fetch Data */
  /* ───────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const token =
        await tokenStorage.getItem("accessToken");

      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      setData(await getAllPages<Enrollment>("enrollments/"));
    } catch (err: any) {
      console.log(
        "Enrollment fetch error:",
        err?.response?.data || err
      );

      if (err?.response?.status === 401) {
        await tokenStorage.removeAuthTokens();
        router.replace("/(auth)/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  /* ───────────────────────────────────────────── */
  /* Initial Load */
  /* ───────────────────────────────────────────── */

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ───────────────────────────────────────────── */
  /* Refresh */
  /* ───────────────────────────────────────────── */

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    fetchData();
  }, [fetchData]);

  /* ───────────────────────────────────────────── */
  /* Summary */
  /* ───────────────────────────────────────────── */

  const summary = {
    total: data.length,

    enrolled: data.filter(
      (e) => e.status?.toUpperCase() === "ENROLLED"
    ).length,

    waitlisted: data.filter(
      (e) => e.status?.toUpperCase() === "WAITLISTED"
    ).length,

    dropped: data.filter(
      (e) => e.status?.toUpperCase() === "DROPPED"
    ).length,
  };

  const enrolledPercent =
    summary.total > 0
      ? Math.round(
          (summary.enrolled / summary.total) * 100
        )
      : 0;

  /* ───────────────────────────────────────────── */
  /* Status Badge */
  /* ───────────────────────────────────────────── */

  const getStatusStyle = (
    status: string
  ) => {
    switch (status) {
      case "ENROLLED":
        return {
          backgroundColor: "#DCFCE7",
          color: "#15803D",
        };

      case "WAITLISTED":
        return {
          backgroundColor: "#FEF3C7",
          color: "#92400E",
        };

      default:
        return {
          backgroundColor: "#FEE2E2",
          color: "#991B1B",
        };
    }
  };

  /* ───────────────────────────────────────────── */
  /* Loading */
  /* ───────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#1D4ED8"
        />

        <Text style={styles.loadingText}>
          Loading enrollments...
        </Text>
      </View>
    );
  }

  /* ───────────────────────────────────────────── */
  /* Render */
  /* ───────────────────────────────────────────── */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        isMobile && styles.mobileContentContainer,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* Header */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Dashboard
          </Text>

          <Text style={styles.subtitle}>
            Enrollment Summary
          </Text>
        </View>

      </View>

      {/* Enrollment Summary */}

      <View style={styles.summaryPanel}>
        <View
          style={[
            styles.summaryHeader,
            isMobile && styles.mobileSummaryHeader,
          ]}
        >
          <View>
            <Text style={styles.summaryTitle}>
              Enrollment Summary
            </Text>

            <Text style={styles.summarySubtitle}>
              Current enrollment status overview
            </Text>
          </View>

          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>
              {enrolledPercent}% enrolled
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${enrolledPercent}%` },
            ]}
          />
        </View>

        <View style={styles.summaryRows}>
          <View style={[styles.summaryRow, isMobile && styles.mobileSummaryRow]}>
            <Text style={styles.summaryRowLabel}>
              Total Requests
            </Text>
            <Text style={styles.summaryRowValue}>
              {summary.total}
            </Text>
          </View>

          <View style={[styles.summaryRow, isMobile && styles.mobileSummaryRow]}>
            <Text style={styles.summaryRowLabel}>
              Enrolled
            </Text>
            <Text style={styles.summaryRowValue}>
              {summary.enrolled}
            </Text>
          </View>

          <View style={[styles.summaryRow, isMobile && styles.mobileSummaryRow]}>
            <Text style={styles.summaryRowLabel}>
              Waitlisted
            </Text>
            <Text style={styles.summaryRowValue}>
              {summary.waitlisted}
            </Text>
          </View>

          <View style={[styles.summaryRow, isMobile && styles.mobileSummaryRow]}>
            <Text style={styles.summaryRowLabel}>
              Dropped
            </Text>
            <Text style={styles.summaryRowValue}>
              {summary.dropped}
            </Text>
          </View>
        </View>
      </View>

      {/* Enrollments */}

      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No enrollments found
          </Text>

          <Text style={styles.emptyText}>
            Your enrollments will
            appear here.
          </Text>
        </View>
      ) : (
        data.map((item) => {
          const statusStyle =
            getStatusStyle(item.status);

          return (
            <View
              key={item.id}
              style={styles.card}
            >
              <View
                style={[
                  styles.cardHeader,
                  isMobile && styles.mobileCardHeader,
                ]}
              >
                <Text
                  style={styles.subject}
                >
                  {item.subject_name}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        statusStyle.backgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        statusStyle.color,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>
                  Student
                </Text>

                <Text style={styles.value}>
                  {item.student_name}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>
                  Section
                </Text>

                <Text style={styles.value}>
                  {item.section_name ||
                    "N/A"}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

/* ───────────────────────────────────────────── */
/* Styles */
/* ───────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
  },

  mobileContentContainer: {
    padding: 14,
    paddingBottom: 84,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },

  summaryPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  mobileSummaryHeader: {
    gap: 10,
    flexWrap: "wrap",
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  summarySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },

  summaryBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  summaryBadgeText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },

  progressTrack: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 14,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#1D4ED8",
    borderRadius: 999,
  },

  summaryRows: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  summaryRow: {
    width: "48%",
    paddingVertical: 8,
  },

  mobileSummaryRow: {
    width: "100%",
  },

  summaryRowLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },

  summaryRowValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  mobileCardHeader: {
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },

  subject: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  row: {
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  value: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },

  emptyCard: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#334155",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
  },
});
