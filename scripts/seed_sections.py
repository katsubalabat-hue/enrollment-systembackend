import sqlite3
from pathlib import Path


DB = Path(__file__).resolve().parents[1] / "db.sqlite3"


def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    inserted = 0
    assigned = 0

    subjects = cur.execute(
        "SELECT id FROM core_subject ORDER BY subject_code"
    ).fetchall()

    for subject in subjects:
        section = cur.execute(
            "SELECT id FROM core_section WHERE subject_id = ? AND section_name = 'A'",
            (subject["id"],),
        ).fetchone()

        if section:
            section_id = section["id"]
        else:
            cur.execute(
                """INSERT INTO core_section
                   (subject_id, section_name, max_capacity, current_count, room, schedule)
                   VALUES (?, 'A', 40, 0, '', '')""",
                (subject["id"],),
            )
            section_id = cur.lastrowid
            inserted += 1

        enrollments = cur.execute(
            """SELECT id FROM core_enrollment
               WHERE subject_id = ?
                 AND (section_id IS NULL OR status = 'WAITLISTED')
               ORDER BY id""",
            (subject["id"],),
        ).fetchall()

        for enrollment in enrollments:
            section_count = cur.execute(
                "SELECT current_count, max_capacity FROM core_section WHERE id = ?",
                (section_id,),
            ).fetchone()

            if section_count["current_count"] >= section_count["max_capacity"]:
                break

            cur.execute(
                """UPDATE core_enrollment
                   SET section_id = ?, status = 'ENROLLED', remarks = '', updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (section_id, enrollment["id"]),
            )
            cur.execute(
                "UPDATE core_section SET current_count = current_count + 1 WHERE id = ?",
                (section_id,),
            )
            assigned += 1

    conn.commit()
    conn.close()

    print(f"Inserted {inserted} sections.")
    print(f"Assigned {assigned} waiting enrollments.")


if __name__ == "__main__":
    main()
