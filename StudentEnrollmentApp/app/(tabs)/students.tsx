import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/app-state";
import { api, getAllPages } from "../../src/api/api";
import { getCurrentUser } from "../../src/api/session";
import {
  cleanText,
  courses,
  firstValidationError,
  getApiErrorMessage,
  semesters,
  validateEmail,
  validateName,
  validateStudentNumber,
  yearLevels,
} from "../../src/utils/validation";

interface Student {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  student_number?: string;
  course?: string;
  year_level?: string;
  semester?: string;
  total_units: number;
  max_units: number;
  is_active: boolean;
}

export default function Students() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [course, setCourse] = useState("Information Technology");
  const [yearLevel, setYearLevel] = useState("1st Year");
  const [semester, setSemester] = useState("1st Sem");
  const [maxUnits, setMaxUnits] = useState("50");

  const fetchStudents = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      setStudents(await getAllPages<Student>("students/"));
    } catch (err: any) {
      console.log(err?.response?.data);

      const message =
        err?.response?.data?.detail ||
        "Failed to load student names";

      setErrorMessage(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        setIsAdmin(user.is_staff);

        if (user.is_staff) {
          fetchStudents();
        } else {
          setErrorMessage("Student directory is available to administrators only.");
          setLoading(false);
        }
      } catch (err: any) {
        console.log(err?.response?.data);
        setErrorMessage("Unable to verify admin access.");
        setLoading(false);
      }
    };

    loadData();
  }, [fetchStudents]);

  const handleAccountStatus = async (student: Student) => {
    const actionName = student.is_active ? "deactivate" : "activate";

    try {
      setActingId(student.id);

      const response = await api.post<Student>(
        `students/${student.id}/${actionName}/`
      );

      setStudents((currentStudents) =>
        currentStudents.map((currentStudent) =>
          currentStudent.id === student.id
            ? response.data
            : currentStudent
        )
      );

      Alert.alert(
        "Success",
        `${getStudentName(student)} has been ${actionName}d.`
      );
    } catch (err: any) {
      console.log(err?.response?.data);

      Alert.alert(
        "Error",
        getApiErrorMessage(
          err?.response?.data,
          "Failed to update student account"
        )
      );
    } finally {
      setActingId(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setStudentNumber("");
    setCourse("Information Technology");
    setYearLevel("1st Year");
    setSemester("1st Sem");
    setMaxUnits("50");
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setFirstName(student.first_name || "");
    setMiddleName(student.middle_name || "");
    setLastName(student.last_name || "");
    setEmail(student.email || "");
    setStudentNumber(student.student_number || "");
    setCourse(student.course || "Information Technology");
    setYearLevel(student.year_level || "1st Year");
    setSemester(student.semester || "1st Sem");
    setMaxUnits(String(student.max_units || 50));
  };

  const handleSubmit = async () => {
    const validationMessage = firstValidationError([
      validateName(firstName, "First name"),
      validateName(middleName, "Middle name", false),
      validateName(lastName, "Last name"),
      validateEmail(email),
      validateStudentNumber(studentNumber),
      course ? "" : "Course is required.",
      yearLevel ? "" : "Year level is required.",
      semester ? "" : "Semester is required.",
      Number.isInteger(Number(maxUnits)) &&
      Number(maxUnits) >= 1 &&
      Number(maxUnits) <= 50
        ? ""
        : "Max units must be a whole number between 1 and 50.",
    ]);

    if (validationMessage) {
      Alert.alert("Error", validationMessage);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        first_name: cleanText(firstName),
        middle_name: cleanText(middleName),
        last_name: cleanText(lastName),
        email: email.trim().toLowerCase(),
        student_number: cleanText(studentNumber).toUpperCase(),
        course,
        year_level: yearLevel,
        semester,
        max_units: Number(maxUnits),
        is_active: true,
      };

      if (editingId) {
        await api.patch(`students/${editingId}/`, payload);
        Alert.alert("Success", "Student updated successfully.");
      } else {
        await api.post("students/", payload);
        Alert.alert("Success", "Student added successfully.");
      }

      resetForm();
      fetchStudents();
    } catch (err: any) {
      console.log(err?.response?.data);
      Alert.alert(
        "Error",
        getApiErrorMessage(err?.response?.data, "Failed to save student")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (student: Student) => {
    Alert.alert(
      "Delete Student",
      `Delete ${getStudentName(student)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActingId(student.id);
              await api.delete(`students/${student.id}/`);
              setStudents((currentStudents) =>
                currentStudents.filter((item) => item.id !== student.id)
              );

              if (editingId === student.id) {
                resetForm();
              }

              Alert.alert("Success", "Student deleted successfully.");
            } catch (err: any) {
              console.log(err?.response?.data);
              Alert.alert(
                "Error",
                getApiErrorMessage(err?.response?.data, "Failed to delete student")
              );
            } finally {
              setActingId(null);
            }
          },
        },
      ]
    );
  };

  const getInitials = (first?: string, last?: string) => {
    const initials = `${first?.trim()?.[0] || ""}${
      last?.trim()?.[0] || ""
    }`.toUpperCase();

    return initials || "?";
  };

  const getStudentName = (student: Student) => {
    const name = `${student.first_name || ""} ${
      student.last_name || ""
    }`.trim();

    return name || student.email || "Unnamed student";
  };

  if (loading) {
    return <LoadingState label="Loading students..." />;
  }

  if (errorMessage) {
    return (
      <View style={styles.page}>
        <View style={styles.container}>
          <ErrorState
            message={errorMessage}
            onRetry={() => fetchStudents()}
          />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.container}
      data={students}
      key={isWide ? "wide" : "narrow"}
      keyExtractor={(student) => String(student.id)}
      numColumns={isWide ? 2 : 1}
      refreshing={refreshing}
      onRefresh={() => fetchStudents(true)}
      ListHeaderComponent={(
        <>
          <Text style={styles.title}>Student Directory</Text>

          <Text style={styles.countText}>
            {students.length} student(s) on record
          </Text>

          {isAdmin ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingId ? "Edit Student" : "Add Student"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />

              <TextInput
                style={styles.input}
                placeholder="Middle Name"
                value={middleName}
                onChangeText={setMiddleName}
              />

              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Student Number"
                value={studentNumber}
                onChangeText={setStudentNumber}
                autoCapitalize="characters"
              />

              <View style={styles.pickerWrap}>
                <Picker selectedValue={course} onValueChange={setCourse}>
                  {courses.map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerWrap}>
                <Picker selectedValue={yearLevel} onValueChange={setYearLevel}>
                  {yearLevels.map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerWrap}>
                <Picker selectedValue={semester} onValueChange={setSemester}>
                  {semesters.map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Max Units"
                value={maxUnits}
                onChangeText={setMaxUnits}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.saveButton, submitting && styles.disabledButton]}
                disabled={submitting}
                onPress={handleSubmit}
              >
                <Text style={styles.accountButtonText}>
                  {editingId ? "Update Student" : "Add Student"}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </>
      )}
      ListEmptyComponent={(
        <EmptyState
          title="No students available"
          message="Student records will appear here once available."
        />
      )}
      renderItem={({ item: student }) => (
        <View style={[styles.card, isWide && styles.gridCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(student.first_name, student.last_name)}
              </Text>
            </View>

            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>
                {getStudentName(student)}
              </Text>

              <Text style={styles.meta}>
                {student.course || "No course"} /{" "}
                {student.year_level || "No year"} /{" "}
                {student.semester || "No semester"}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                student.is_active ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {student.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          <View style={styles.detailGrid}>
            <Text style={styles.detailText}>
              ID: {student.student_number || "N/A"}
            </Text>
            <Text style={styles.detailText}>
              Units: {student.total_units}/{student.max_units}
            </Text>
            <Text style={styles.detailText}>
              Email: {student.email}
            </Text>
          </View>

          {isAdmin ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                disabled={actingId === student.id}
                onPress={() => handleEdit(student)}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  student.is_active
                    ? styles.deactivateButton
                    : styles.activateButton,
                  actingId === student.id && styles.disabledButton,
                ]}
                disabled={actingId === student.id}
                onPress={() => handleAccountStatus(student)}
              >
                <Text style={styles.accountButtonText}>
                  {student.is_active ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.deleteButton,
                  actingId === student.id && styles.disabledButton,
                ]}
                disabled={actingId === student.id}
                onPress={() => handleDelete(student)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    />
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

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#0F172A",
  },

  countText: {
    color: "#64748B",
    marginBottom: 16,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  formTitle: {
    color: "#0F172A",
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
    backgroundColor: "#FFFFFF",
  },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  saveButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1D4ED8",
  },

  cancelButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginTop: 8,
  },

  cancelButtonText: {
    color: "#475569",
    fontWeight: "700",
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },

  gridCard: {
    marginHorizontal: 6,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },

  studentInfo: {
    flex: 1,
    marginLeft: 10,
  },

  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  meta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  activeBadge: {
    backgroundColor: "#DCFCE7",
  },

  inactiveBadge: {
    backgroundColor: "#FEE2E2",
  },

  statusText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },

  detailGrid: {
    marginTop: 12,
    gap: 4,
  },

  detailText: {
    color: "#475569",
    fontSize: 13,
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  actionButton: {
    flexGrow: 1,
    minHeight: 40,
    minWidth: 96,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  editButton: {
    backgroundColor: "#FEF3C7",
  },

  deleteButton: {
    backgroundColor: "#FEE2E2",
  },

  accountButton: {
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  activateButton: {
    backgroundColor: "#16A34A",
  },

  deactivateButton: {
    backgroundColor: "#DC2626",
  },

  disabledButton: {
    opacity: 0.7,
  },

  accountButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  actionButtonText: {
    color: "#0F172A",
    fontWeight: "700",
  },
});
