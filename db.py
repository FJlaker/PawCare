import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "pawcare.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    schema_path = os.path.join(BASE_DIR, "schema.sql")
    if not os.path.exists(schema_path):
        return

    with open(schema_path, "r", encoding="utf-8") as file:
        schema_sql = file.read()

    conn = get_db_connection()
    conn.executescript(schema_sql)
    patient_columns = {row[1] for row in conn.execute("PRAGMA table_info(patients)")}
    if "neutered_spayed" not in patient_columns:
        conn.execute("ALTER TABLE patients ADD COLUMN neutered_spayed INTEGER NOT NULL DEFAULT 0")
    if "photo_path" not in patient_columns:
        conn.execute("ALTER TABLE patients ADD COLUMN photo_path TEXT")
    visit_columns = {row[1] for row in conn.execute("PRAGMA table_info(visits)")}
    if "patient_id" not in visit_columns:
        conn.execute("ALTER TABLE visits ADD COLUMN patient_id INTEGER REFERENCES patients(id)")
        conn.execute(
            """
            UPDATE visits
            SET patient_id = (
                SELECT patients.id FROM patients
                WHERE lower(trim(patients.pet_name)) = lower(trim(visits.pet_name))
                  AND lower(trim(patients.owner_name)) = lower(trim(visits.owner_name))
                ORDER BY patients.id
                LIMIT 1
            )
            WHERE patient_id IS NULL
            """
        )
    if "notes" not in visit_columns:
        conn.execute("ALTER TABLE visits ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
    if "staff_name" not in visit_columns:
        conn.execute("ALTER TABLE visits ADD COLUMN staff_name TEXT NOT NULL DEFAULT ''")
    conn.commit()
    conn.close()

    seed_demo_data()


def seed_demo_data():
    conn = get_db_connection()

    patient_count = conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    if patient_count == 0:
        sample_patients = [
            ("Bella", "Dog", "Labrador", "2022-04-12", "Female", "Sarah Johnson", "sarah@example.com", "0412345678", 1),
            ("Milo", "Cat", "Tabby", "2021-09-20", "Male", "Daniel Lee", "daniel@example.com", "0400123456", 1),
            ("Coco", "Rabbit", "Mini Lop", "2023-02-18", "Female", "Ava Patel", "ava@example.com", "0825550103", 0),
            ("Rocky", "Dog", "Mixed breed", "2020-11-03", "Male", "Noah Williams", "noah@example.com", "0835550104", 1),
            ("Kiwi", "Bird", "Parakeet", "2024-01-27", "Female", "Liam Smith", "liam@example.com", "0845550105", 0),
            ("Nala", "Cat", "Domestic shorthair", "2019-06-09", "Female", "Emma Brown", "emma@example.com", "0725550106", 1),
        ]
        conn.executemany(
            """
            INSERT INTO patients (pet_name, species, breed, dob, gender, owner_name, email, phone, neutered_spayed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            sample_patients,
        )

    visit_count = conn.execute("SELECT COUNT(*) FROM visits").fetchone()[0]
    if visit_count == 0:
        patients = conn.execute(
            "SELECT id, pet_name, species, owner_name FROM patients ORDER BY id"
        ).fetchall()
        visit_types = (
            "Annual checkup", "Vaccination booster", "Surgery follow-up",
            "Spay/Neuter", "Consultation", "Emergency",
        )
        sample_visits = []
        for month in range(3, 9):
            for visit_in_month in range(5):
                patient = patients[(month + visit_in_month) % len(patients)]
                sample_visits.append((
                    patient["id"],
                    patient["pet_name"],
                    patient["owner_name"],
                    visit_types[(month + visit_in_month) % len(visit_types)],
                    f"2026-{month:02d}-{4 + visit_in_month * 5:02d}",
                    f"{9 + visit_in_month:02d}:00",
                    "",
                    "Alex Morgan",
                ))
        conn.executemany(
            """
            INSERT INTO visits (patient_id, pet_name, owner_name, visit_type, date, time, notes, staff_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            sample_visits,
        )

    conn.commit()
    conn.close()
