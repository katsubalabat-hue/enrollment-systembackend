import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { Picker } from "@react-native-picker/picker";
import { api, getAllPages } from "../../src/api/api";
import { getCurrentUser } from "../../src/api/session";
import { getApiErrorMessage } from "../../src/utils/validation";

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
}

interface Section {
  id: number;
  subject: number;
  subject_code: string;
  subject_name: string;
  section_name: string;
  max_capacity: number;
  current_count: number;
  room?: string;
  schedule?: string;
}

interface Enrollment {
  id: number;
  student_name: string;
  subject_name: string;
  section_name?: string;
  status: string;
  remarks?: string;
  enrollment_date?: string;
}

const statusOptions = [
  "ALL",
  "PENDING",
  "ENROLLED",
  "WAITLISTED",
  "REJECTED",
  "DROPPED",
  "CANCELLED",
];

export default function Enrollments() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const availableSections = useMemo(
    () => sections.filter((section) => section.subject === Number(subjectId)),
    [sections, subjectId]
  );

  const fetchSubjects = useCallback(async () => {
    setSubjects(await getAllPages<Subject>("subjects/"));
  }, []);

  const fetchSections = useCallback(async () => {
    setSections(await getAllPages<Section>("sections/"));
  }, []);

  const fetchEnrollments = useCallback(async () => {
    const params =
      isAdmin && statusFilter !== "ALL"
        ? { status: statusFilter }
        : undefined;

    setEnrollments(await getAllPages<Enrollment>("enrollments/", { params }));
  }, [isAdmin, statusFilter]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUser();
      setIsAdmin(user.is_staff);
      setRoleLoaded(true);

      await Promise.all([
        fetchSubjects(),
        fetchSections(),
      ]);
    } catch (err: any) {
      console.log(err?.response?.data);
      Alert.alert(
        "Error",
        getApiErrorMessage(err?.response?.data, "Failed to load enrollment data")
      );
    } finally {
      setLoading(false);
    }
  }, [fetchSections, fetchSubjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!roleLoaded) {
      return;
    }

    fetchEnrollments().catch((err: any) => {
      console.log(err?.response?.data);
      Alert.alert(
        "Error",
        getApiErrorMessage(err?.response?.data, "Failed to load enrollments")
      );
    });
  }, [fetchEnrollments, roleLoaded]);

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    setSectionId("");
  };

  const handleAddEnrollment = async () => {
    if (!subjectId) {
      Alert.alert("Error", "Please select a subject.");
      return;
    }

    const selectedSection = sections.find(
      (section) => section.id === Number(sectionId)
    );

    if (
      selectedSection &&
      selectedSection.current_count >= selectedSection.max_capacity
    ) {
      Alert.alert("Error", "Selected section is already full.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("enrollments/", {
        subject: Number(subjectId),
        ...(sectionId ? { section: Number(sectionId) } : {}),
      });

      setSubjectId("");
      setSectionId("");
      await Promise.all([fetchSections(), fetchEnrollments()]);

      Alert.alert("Success", "Enrollment request submitted.");
    } catch (err: any) {
      console.log(err?.response?.data);
      Alert.alert(
        "Error",
        getApiErrorMessage(err?.response?.data, "Failed to add enrollment")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAction = async (
    enrollmentId: number,
    actionName: "approve" | "reject" | "drop" | "cancel" | "re-enroll"
  ) => {
    try {
      setActingId(enrollmentId);

      await api.post(`enrollments/${enrollmentId}/${actionName}/`, {
        ...(remarks ? { remarks } : {}),
      });

      setRemarks("");
      await Promise.all([fetchSections(), fetchEnrollments()]);
      Alert.alert("Success", `Enrollment ${actionName.replace("-", " ")} completed.`);
    } catch (err: any) {
      console.log(err?.response?.data);
      Alert.alert(
        "Error",
        getApiErrorMessage(err?.response?.data, "Failed to update enrollment")
      );
    } finally {
      setActingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ENROLLED":
        return styles.statusGreen;
      case "PENDING":
      case "WAITLISTED":
        return styles.statusAmber;
      case "REJECTED":
      case "DROPPED":
      case "CANCELLED":
        return styles.statusRed;
      default:
        return styles.statusNeutral;
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={[styles.header, !isWide && styles.mobileHeader]}>
        <View>
          <Text style={styles.title}>
            {isAdmin ? "Enrollment Requests" : "Add Enrollment"}
          </Text>

          <Text style={styles.subtitle}>
            {isAdmin
              ? `${enrollments.length} record(s) for review`
              : "Choose a subject and section"}
          </Text>
        </View>

        {isAdmin ? (
          <View style={styles.filterWrap}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(value) => setStatusFilter(String(value))}
            >
              {statusOptions.map((item) => (
                <Picker.Item key={item} label={item} value={item} />
              ))}
            </Picker>
          </View>
        ) : null}
      </View>

      {isAdmin ? (
        <View style={styles.adminPanel}>
          <TextInput
            style={styles.input}
            placeholder="Remarks for the next action"
            value={remarks}
            onChangeText={setRemarks}
          />

          {enrollments.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>No enrollment records</Text>
              <Text style={styles.emptyText}>Change the status filter to view other records.</Text>
            </View>
          ) : (
            enrollments.map((enrollment) => (
              <View key={enrollment.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitle}>{enrollment.subject_name}</Text>
                    <Text style={styles.metaText}>{enrollment.student_name}</Text>
                  </View>

                  <View style={[styles.statusBadge, getStatusStyle(enrollment.status)]}>
                    <Text style={styles.statusText}>{enrollment.status}</Text>
                  </View>
                </View>

                <Text style={styles.metaText}>
                  Section: {enrollment.section_name || "Auto assign"}
                </Text>

                {enrollment.remarks ? (
                  <Text style={styles.metaText}>Remarks: {enrollment.remarks}</Text>
                ) : null}

                <View style={styles.actionRow}>
                  {enrollment.status !== "ENROLLED" ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      disabled={actingId === enrollment.id}
                      onPress={() => handleAdminAction(enrollment.id, "approve")}
                    >
                      <Text style={styles.actionText}>Approve</Text>
                    </TouchableOpacity>
                  ) : null}

                  {enrollment.status === "PENDING" || enrollment.status === "WAITLISTED" ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      disabled={actingId === enrollment.id}
                      onPress={() => handleAdminAction(enrollment.id, "reject")}
                    >
                      <Text style={styles.actionText}>Reject</Text>
                    </TouchableOpacity>
                  ) : null}

                  {enrollment.status === "ENROLLED" ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.dropButton]}
                      disabled={actingId === enrollment.id}
                      onPress={() => handleAdminAction(enrollment.id, "drop")}
                    >
                      <Text style={styles.actionText}>Drop</Text>
                    </TouchableOpacity>
                  ) : null}

                  {["DROPPED", "REJECTED", "CANCELLED"].includes(enrollment.status) ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      disabled={actingId === enrollment.id}
                      onPress={() => handleAdminAction(enrollment.id, "re-enroll")}
                    >
                      <Text style={styles.actionText}>Re-enroll</Text>
                    </TouchableOpacity>
                  ) : null}

                  {enrollment.status === "PENDING" ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      disabled={actingId === enrollment.id}
                      onPress={() => handleAdminAction(enrollment.id, "cancel")}
                    >
                      <Text style={styles.actionText}>Cancel</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={[styles.formCard, isWide && styles.wideFormCard]}>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={subjectId}
              onValueChange={(value) => handleSubjectChange(String(value))}
            >
              <Picker.Item label="Select subject..." value="" />

              {subjects.map((subject) => (
                <Picker.Item
                  key={subject.id}
                  label={`${subject.subject_code} - ${subject.subject_name}`}
                  value={String(subject.id)}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerWrap}>
            <Picker
              enabled={Boolean(subjectId)}
              selectedValue={sectionId}
              onValueChange={(value) => setSectionId(String(value))}
            >
              <Picker.Item
                label={subjectId ? "Auto assign section..." : "Select a subject first..."}
                value=""
              />

              {availableSections.map((section) => (
                <Picker.Item
                  key={section.id}
                  label={`Section ${section.section_name} (${section.current_count}/${section.max_capacity})`}
                  value={String(section.id)}
                />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            onPress={handleAddEnrollment}
            disabled={submitting}
            style={[styles.btnPrimary, submitting && styles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    padding: 16,
    paddingBottom: 84,
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  mobileHeader: {
    alignItems: "stretch",
    flexDirection: "column",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    marginTop: 4,
  },

  filterWrap: {
    minWidth: 190,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  adminPanel: {
    gap: 12,
  },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  wideFormCard: {
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },

  btnPrimary: {
    minHeight: 48,
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  btnDisabled: {
    opacity: 0.7,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },

  cardTitleWrap: {
    flex: 1,
  },

  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },

  metaText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusGreen: {
    backgroundColor: "#DCFCE7",
  },

  statusAmber: {
    backgroundColor: "#FEF3C7",
  },

  statusRed: {
    backgroundColor: "#FEE2E2",
  },

  statusNeutral: {
    backgroundColor: "#E2E8F0",
  },

  statusText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  actionButton: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  approveButton: {
    backgroundColor: "#16A34A",
  },

  rejectButton: {
    backgroundColor: "#DC2626",
  },

  dropButton: {
    backgroundColor: "#EA580C",
  },

  cancelButton: {
    backgroundColor: "#475569",
  },

  actionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  emptyPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },

  emptyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },

  emptyText: {
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
  },
});
