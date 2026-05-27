import sqlite3
from pathlib import Path


DB = Path(__file__).resolve().parents[1] / "db.sqlite3"

COURSES = {
    "Information Technology": {
        ("1st Year", "1st Sem"): [("IT101", "Introduction to Computing", 3), ("IT102", "Computer Programming 1", 3)],
        ("1st Year", "2nd Sem"): [("IT103", "Computer Programming 2", 3), ("IT104", "Discrete Mathematics", 3)],
        ("2nd Year", "1st Sem"): [("IT201", "Data Structures and Algorithms", 3), ("IT202", "Human Computer Interaction", 3), ("IT203", "Networking 1", 3)],
        ("2nd Year", "2nd Sem"): [("IT204", "Information Management", 3), ("IT205", "Object-Oriented Programming", 3), ("IT206", "Networking 2", 3)],
        ("3rd Year", "1st Sem"): [("IT301", "Web Systems and Technologies", 3), ("IT302", "Systems Integration and Architecture", 3), ("IT303", "Software Engineering", 3)],
        ("3rd Year", "2nd Sem"): [("IT304", "Mobile Application Development", 3), ("IT305", "Information Assurance and Security", 3), ("IT306", "IT Project Management", 3)],
        ("4th Year", "1st Sem"): [("IT401", "Capstone Project 1", 3), ("IT402", "Professional Elective 1", 3), ("IT403", "Systems Administration", 3)],
        ("4th Year", "2nd Sem"): [("IT404", "Capstone Project 2", 3), ("IT405", "Practicum", 6), ("IT406", "Professional Elective 2", 3)],
    },
    "Computer Science": {
        ("1st Year", "1st Sem"): [("CS101", "Introduction to Computing", 3), ("CS102", "Computer Programming 1", 3)],
        ("1st Year", "2nd Sem"): [("CS103", "Computer Programming 2", 3), ("CS104", "Discrete Structures 1", 3)],
        ("2nd Year", "1st Sem"): [("CS201", "Data Structures and Algorithms", 3), ("CS202", "Computer Organization", 3), ("CS203", "Discrete Structures 2", 3)],
        ("2nd Year", "2nd Sem"): [("CS204", "Design and Analysis of Algorithms", 3), ("CS205", "Operating Systems", 3), ("CS206", "Automata Theory", 3)],
        ("3rd Year", "1st Sem"): [("CS301", "Software Engineering 1", 3), ("CS302", "Database Systems", 3), ("CS303", "Programming Languages", 3)],
        ("3rd Year", "2nd Sem"): [("CS304", "Software Engineering 2", 3), ("CS305", "Artificial Intelligence", 3), ("CS306", "Computer Networks", 3)],
        ("4th Year", "1st Sem"): [("CS401", "Thesis 1", 3), ("CS402", "CS Elective 1", 3), ("CS403", "Information Assurance and Security", 3)],
        ("4th Year", "2nd Sem"): [("CS404", "Thesis 2", 3), ("CS405", "Practicum", 6), ("CS406", "CS Elective 2", 3)],
    },
    "Technology Communication Management": {
        ("1st Year", "1st Sem"): [("TCM101", "Introduction to Technology Communication", 3), ("TCM102", "Digital Literacy", 3)],
        ("1st Year", "2nd Sem"): [("TCM103", "Technical Writing", 3), ("TCM104", "Communication Theory", 3)],
        ("2nd Year", "1st Sem"): [("TCM201", "Multimedia Production", 3), ("TCM202", "Visual Communication", 3), ("TCM203", "Media Ethics", 3)],
        ("2nd Year", "2nd Sem"): [("TCM204", "Web Content Management", 3), ("TCM205", "Digital Marketing", 3), ("TCM206", "Research Methods", 3)],
        ("3rd Year", "1st Sem"): [("TCM301", "Project Management", 3), ("TCM302", "Instructional Media Design", 3), ("TCM303", "Communication Campaigns", 3)],
        ("3rd Year", "2nd Sem"): [("TCM304", "Enterprise Communication Systems", 3), ("TCM305", "Data Visualization", 3), ("TCM306", "Professional Communication", 3)],
        ("4th Year", "1st Sem"): [("TCM401", "Capstone Project 1", 3), ("TCM402", "TCM Elective 1", 3), ("TCM403", "Seminar in Technology Communication", 3)],
        ("4th Year", "2nd Sem"): [("TCM404", "Capstone Project 2", 3), ("TCM405", "Practicum", 6), ("TCM406", "TCM Elective 2", 3)],
    },
}

GENERAL = {
    ("1st Year", "1st Sem"): [("GE101", "Purposive Communication", 3), ("GE102", "Mathematics in the Modern World", 3), ("PE101", "Physical Education 1", 2), ("NSTP101", "NSTP 1", 3)],
    ("1st Year", "2nd Sem"): [("GE103", "Understanding the Self", 3), ("GE104", "Readings in Philippine History", 3), ("PE102", "Physical Education 2", 2), ("NSTP102", "NSTP 2", 3)],
    ("2nd Year", "1st Sem"): [("GE105", "Art Appreciation", 3), ("GE106", "Science, Technology, and Society", 3), ("PE103", "Physical Education 3", 2)],
    ("2nd Year", "2nd Sem"): [("GE107", "Ethics", 3), ("GE108", "The Contemporary World", 3), ("PE104", "Physical Education 4", 2)],
}


def upsert_subject(cur, code, name, units, course, year_level, semester):
    row = cur.execute("SELECT id FROM core_subject WHERE subject_code = ?", (code,)).fetchone()
    if row:
        cur.execute(
            """UPDATE core_subject
               SET subject_name = ?, units = ?, course = ?, year_level = ?, semester = ?, updated_at = CURRENT_TIMESTAMP
               WHERE subject_code = ?""",
            (name, units, course, year_level, semester, code),
        )
        return "updated"

    cur.execute(
        """INSERT INTO core_subject
           (subject_code, subject_name, description, units, course, year_level, semester, created_at, updated_at)
           VALUES (?, ?, '', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
        (code, name, units, course, year_level, semester),
    )
    return "inserted"


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    counts = {"inserted": 0, "updated": 0}

    for course, curriculum in COURSES.items():
        for (year_level, semester), subjects in curriculum.items():
            for code, name, units in subjects:
                counts[upsert_subject(cur, code, name, units, course, year_level, semester)] += 1

    for (year_level, semester), subjects in GENERAL.items():
        for code, name, units in subjects:
            counts[upsert_subject(cur, code, name, units, "GENERAL", year_level, semester)] += 1

    conn.commit()
    conn.close()
    print(f"Inserted {counts['inserted']} subjects, updated {counts['updated']} subjects.")


if __name__ == "__main__":
    main()
