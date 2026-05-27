import React, { useEffect, useState } from "react";

import {
  View,
  Text,
 ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { Picker } from "@react-native-picker/picker";
import { api, getAllPages } from "../../src/api/api";
import { getCurrentUser } from "../../src/api/session";
import {
  cleanText,
  courses,
  firstValidationError,
  getApiErrorMessage,
  semesters,
  validateSubjectCode,
  validateUnits,
  yearLevels,
} from "../../src/utils/validation";

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  units: number;
  course: string;
  year_level: string;
  semester: string;
}

export default function Subjects() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [subjectCode, setSubjectCode] =
    useState("");

  const [subjectName, setSubjectName] =
    useState("");

  const [units, setUnits] = useState("");
  const [course, setCourse] = useState("Information Technology");
  const [yearLevel, setYearLevel] = useState("1st Year");
  const [semester, setSemester] = useState("1st Sem");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

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
          "Failed to load subjects."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────────────────────────── */
  /* Initial Load */
  /* ───────────────────────────────────────────── */

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        setIsAdmin(user.is_staff);
      } catch (err: any) {
        console.log(err?.response?.data);
      } finally {
        fetchSubjects();
      }
    };

    loadData();
  }, []);

  /* ───────────────────────────────────────────── */
  /* Reset Form */
  /* ───────────────────────────────────────────── */

  const resetForm = () => {
    setSubjectCode("");
    setSubjectName("");
    setUnits("");
    setCourse("Information Technology");
    setYearLevel("1st Year");
    setSemester("1st Sem");
    setEditingId(null);
  };

  /* ───────────────────────────────────────────── */
  /* Submit */
  /* ───────────────────────────────────────────── */

  const handleSubmit = async () => {
    const validationMessage = firstValidationError([
      validateSubjectCode(subjectCode),
      cleanText(subjectName) ? "" : "Subject name is required.",
      cleanText(subjectName).length > 255 ? "Subject name must be 255 characters or fewer." : "",
      validateUnits(units),
      course ? "" : "Course is required.",
      yearLevel ? "" : "Year level is required.",
      semester ? "" : "Semester is required.",
    ]);

    if (validationMessage) {
      Alert.alert("Error", validationMessage);

      return;
    }

    const isDuplicate = subjects.some(
      (s) =>
        s.subject_code.toLowerCase() ===
          subjectCode.toLowerCase() &&
        s.id !== editingId
    );

    if (isDuplicate) {
      Alert.alert(
        "Error",
        "Subject code already exists."
      );

      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        subject_code:
          cleanText(subjectCode).toUpperCase(),

        subject_name: cleanText(subjectName),

        units: Number(units),
        course,
        year_level: yearLevel,
        semester,
      };

      if (editingId) {
        await api.put(
          `subjects/${editingId}/`,
          payload
        );

        Alert.alert(
          "Success",
          "Subject updated successfully."
        );
      } else {
        await api.post(
          "subjects/",
          payload
        );

        Alert.alert(
          "Success",
          "Subject added successfully."
        );
      }

      resetForm();

      fetchSubjects();
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
  /* Edit */
  /* ───────────────────────────────────────────── */

  const handleEdit = (subject: Subject) => {
    setSubjectCode(subject.subject_code);

    setSubjectName(subject.subject_name);

    setUnits(String(subject.units));
    setCourse(subject.course);
    setYearLevel(subject.year_level);
    setSemester(subject.semester);

    setEditingId(subject.id);
  };

  /* ───────────────────────────────────────────── */
  /* Delete */
  /* ───────────────────────────────────────────── */

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Subject",
      "Are you sure you want to delete this subject?",
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
              await api.delete(
                `subjects/${id}/`
              );

              Alert.alert(
                "Success",
                "Subject deleted successfully."
              );

              fetchSubjects();
            } catch (err: any) {
              console.log(
                err?.response?.data
              );

              Alert.alert(
                "Error",
                err?.response?.data
                  ?.detail ||
                  "Failed to delete subject."
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
        Subject Management
      </Text>

      <Text style={styles.countText}>
        {subjects.length} subject(s) on record
      </Text>

      {/* Form */}

      {isAdmin && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId
              ? "Edit Subject"
              : "Add Subject"}
          </Text>

          <TextInput
            placeholder="Subject Code"
            style={styles.input}
            value={subjectCode}
            onChangeText={setSubjectCode}
            autoCapitalize="characters"
          />

          <TextInput
            placeholder="Subject Name"
            style={styles.input}
            value={subjectName}
            onChangeText={setSubjectName}
          />

          <TextInput
            placeholder="Units"
            style={styles.input}
            value={units}
            onChangeText={setUnits}
            keyboardType="numeric"
          />

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={course}
              onValueChange={setCourse}
            >
              {courses.map((item) => (
                <Picker.Item
                  key={item}
                  label={item}
                  value={item}
                />
              ))}
              <Picker.Item
                label="General"
                value="GENERAL"
              />
            </Picker>
          </View>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={yearLevel}
              onValueChange={setYearLevel}
            >
              {yearLevels.map((item) => (
                <Picker.Item key={item} label={item} value={item} />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={semester}
              onValueChange={setSemester}
            >
              {semesters.map((item) => (
                <Picker.Item key={item} label={item} value={item} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              submitting && {
                opacity: 0.7,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {editingId
                  ? "Update Subject"
                  : "Add Subject"}
              </Text>
            )}
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={resetForm}
            >
              <Text
                style={styles.btnCancelText}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Subjects List */}

      {subjects.length === 0 ? (
        <Text style={styles.emptyText}>
          No subjects available.
        </Text>
      ) : (
        <View style={isWide && styles.grid}>
          {subjects.map((sub) => (
          <View
            key={sub.id}
            style={[styles.card, isWide && styles.gridCard]}
          >
            <View
              style={styles.cardHeader}
            >
              <View>
                <Text
                  style={
                    styles.subjectCode
                  }
                >
                  {sub.subject_code}
                </Text>

                <Text
                  style={
                    styles.subjectName
                  }
                >
                  {sub.subject_name}
                </Text>

                <Text style={styles.curriculumText}>
                  {sub.course} / {sub.year_level} / {sub.semester}
                </Text>
              </View>

              <View
                style={styles.unitsBadge}
              >
                <Text
                  style={
                    styles.unitsText
                  }
                >
                  {sub.units}{" "}
                  {sub.units === 1
                    ? "unit"
                    : "units"}
                </Text>
              </View>
            </View>

            {isAdmin && (
              <View
                style={styles.actionRow}
              >
                <TouchableOpacity
                  style={styles.btnEdit}
                  onPress={() =>
                    handleEdit(sub)
                  }
                >
                  <Text>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnDelete}
                  onPress={() =>
                    handleDelete(sub.id)
                  }
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
    marginBottom: 6,
    color: "#0F172A",
  },

  countText: {
    color: "#64748B",
    marginBottom: 16,
  },

  formCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
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

  btnCancel: {
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  btnCancelText: {
    color: "#475569",
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

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  subjectCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  subjectName: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },

  curriculumText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },

  unitsBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },

  unitsText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
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
