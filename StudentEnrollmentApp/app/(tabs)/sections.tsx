import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";

import { Picker } from "@react-native-picker/picker";
import { api, getAllPages } from "../../src/api/api";
import { getCurrentUser } from "../../src/api/session";
import {
  cleanText,
  firstValidationError,
  getApiErrorMessage,
  validateCapacity,
  validateSectionName,
} from "../../src/utils/validation";

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

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
}

/* ───────────────────────────────────────────── */
/* Capacity Bar */
/* ───────────────────────────────────────────── */

function CapacityBar({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(current / max, 1) : 0;

  const barColor =
    pct >= 1
      ? "#EF4444"
      : pct >= 0.8
      ? "#F59E0B"
      : "#22C55E";

  return (
    <View style={styles.capacityContainer}>
      <View style={styles.capacityTrack}>
        <View
          style={[
            styles.capacityFill,
            {
              width: `${pct * 100}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      <Text style={styles.capacityText}>
        {current}/{max}
      </Text>
    </View>
  );
}

/* ───────────────────────────────────────────── */
/* Main Component */
/* ───────────────────────────────────────────── */

export default function Sections() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [subjectId, setSubjectId] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [room, setRoom] = useState("");
  const [schedule, setSchedule] = useState("");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const getSubjectLabel = (sec: Section) => {
    const code = sec.subject_code?.trim();
    const name = sec.subject_name?.trim();

    if (code && name) {
      return `${code} - ${name}`;
    }

    return code || name || `Subject #${sec.subject}`;
  };

  /* ───────────────────────────────────────────── */
  /* Fetch Sections */
  /* ───────────────────────────────────────────── */

  const fetchSections = async () => {
    try {
      setSections(await getAllPages<Section>("sections/"));
    } catch (err: any) {
      console.log(err?.response?.data);

      Alert.alert(
        "Error",
        err?.response?.data?.detail ||
          "Failed to load sections"
      );
    }
  };

  /* ───────────────────────────────────────────── */
  /* Fetch Subjects */
  /* ───────────────────────────────────────────── */

  const fetchSubjects = async () => {
    try {
      setSubjects(await getAllPages<Subject>("subjects/"));
    } catch (err: any) {
      console.log(err?.response?.data);

      Alert.alert(
        "Error",
        err?.response?.data?.detail ||
          "Failed to load subjects"
      );
    }
  };

  /* ───────────────────────────────────────────── */
  /* Initial Load */
  /* ───────────────────────────────────────────── */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const user = await getCurrentUser();
        setIsAdmin(user.is_staff);

        await Promise.all([
          fetchSections(),
          fetchSubjects(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* ───────────────────────────────────────────── */
  /* Submit */
  /* ───────────────────────────────────────────── */

  const handleSubmit = async () => {
    const validationMessage = firstValidationError([
      subjectId ? "" : "Subject is required.",
      validateSectionName(sectionName),
      validateCapacity(maxCapacity),
    ]);

    if (validationMessage) {
      Alert.alert("Error", validationMessage);

      return;
    }

    const isDuplicate = sections.some(
      (sec) =>
        sec.subject === Number(subjectId) &&
        sec.section_name
          .toLowerCase()
          .trim() ===
          cleanText(sectionName).toLowerCase() &&
        sec.id !== editingId
    );

    if (isDuplicate) {
      Alert.alert(
        "Error",
        "Section already exists for this subject."
      );

      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        subject: Number(subjectId),
        section_name: cleanText(sectionName).toUpperCase(),
        max_capacity: Number(maxCapacity),
        room: cleanText(room),
        schedule: cleanText(schedule),
      };

      if (editingId) {
        await api.put(
          `sections/${editingId}/`,
          payload
        );

        Alert.alert(
          "Success",
          "Section updated successfully."
        );
      } else {
        await api.post("sections/", payload);

        Alert.alert(
          "Success",
          "Section added successfully."
        );
      }

      resetForm();

      fetchSections();
    } catch (err: any) {
      console.log(err?.response?.data);

      Alert.alert(
        "Error",
        getApiErrorMessage(
          err?.response?.data,
          "Something went wrong."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────────────────────────────────────────── */
  /* Reset Form */
  /* ───────────────────────────────────────────── */

  const resetForm = () => {
    setSubjectId("");
    setSectionName("");
    setMaxCapacity("");
    setRoom("");
    setSchedule("");
    setEditingId(null);
  };

  /* ───────────────────────────────────────────── */
  /* Edit */
  /* ───────────────────────────────────────────── */

  const handleEdit = (sec: Section) => {
    setSubjectId(String(sec.subject));
    setSectionName(sec.section_name);
    setMaxCapacity(String(sec.max_capacity));
    setRoom(sec.room || "");
    setSchedule(sec.schedule || "");
    setEditingId(sec.id);
  };

  /* ───────────────────────────────────────────── */
  /* Delete */
  /* ───────────────────────────────────────────── */

  const handleDelete = async (id: number) => {
    Alert.alert(
      "Delete Section",
      "Are you sure you want to delete this section?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`sections/${id}/`);

              Alert.alert(
                "Success",
                "Section deleted successfully."
              );

              fetchSections();
            } catch (err: any) {
              console.log(err?.response?.data);

              Alert.alert(
                "Error",
                err?.response?.data?.detail ||
                  "Failed to delete section"
              );
            }
          },
        },
      ]
    );
  };

  /* ───────────────────────────────────────────── */
  /* Loading */
  /* ───────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color="#1D4ED8"
        />
      </View>
    );
  }

  /* ───────────────────────────────────────────── */
  /* Render */
  /* ───────────────────────────────────────────── */

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        Section Management
      </Text>

      <Text style={styles.countText}>
        {sections.length} section(s) on record
      </Text>

      {isAdmin && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId
              ? "Edit Section"
              : "Add Section"}
          </Text>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={subjectId}
              onValueChange={(val) =>
                setSubjectId(String(val))
              }
            >
              <Picker.Item
                label="Select subject..."
                value=""
              />

              {subjects.map((sub) => (
                <Picker.Item
                  key={sub.id}
                  label={`${sub.subject_code} — ${sub.subject_name}`}
                  value={sub.id}
                />
              ))}
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Section Name"
            value={sectionName}
            onChangeText={setSectionName}
          />

          <TextInput
            style={styles.input}
            placeholder="Max Capacity"
            value={maxCapacity}
            onChangeText={setMaxCapacity}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Room"
            value={room}
            onChangeText={setRoom}
          />

          <TextInput
            style={styles.input}
            placeholder="Schedule"
            value={schedule}
            onChangeText={setSchedule}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              styles.btnPrimary,
              submitting && {
                opacity: 0.7,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {editingId
                  ? "Update Section"
                  : "Add Section"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {sections.length === 0 ? (
        <Text style={styles.emptyText}>
          No sections available.
        </Text>
      ) : (
        <View style={isWide && styles.grid}>
          {sections.map((sec) => (
          <View
            key={sec.id}
            style={[styles.card, isWide && styles.gridCard]}
          >
            <Text style={styles.sectionName}>
              {getSubjectLabel(sec)} - Section {sec.section_name}
            </Text>

            <Text style={styles.subjectLabel}>
              {getSubjectLabel(sec)}
            </Text>

            <Text style={styles.scheduleText}>
              {sec.schedule || "No schedule"} / {sec.room || "No room"}
            </Text>

            <CapacityBar
              current={sec.current_count}
              max={sec.max_capacity}
            />

            {isAdmin && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleEdit(sec)}
                  style={styles.btnEdit}
                >
                  <Text>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleDelete(sec.id)
                  }
                  style={styles.btnDelete}
                >
                  <Text>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ───────────────────────────────────────────── */
/* Styles */
/* ───────────────────────────────────────────── */

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

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  countText: {
    marginBottom: 16,
    color: "#64748B",
  },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  formTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
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
    marginBottom: 10,
    backgroundColor: "#fff",
  },

  btnPrimary: {
    backgroundColor: "#1D4ED8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  gridCard: {
    width: "49%",
  },

  sectionName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  subjectLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 10,
  },

  scheduleText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 10,
  },

  capacityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  capacityTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 99,
    overflow: "hidden",
  },

  capacityFill: {
    height: "100%",
    borderRadius: 99,
  },

  capacityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  btnEdit: {
    flex: 1,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
    marginRight: 4,
    alignItems: "center",
  },

  btnDelete: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginLeft: 4,
    alignItems: "center",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748B",
  },
});
