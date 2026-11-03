CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    dob TEXT,
    gender TEXT,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    neutered_spayed INTEGER NOT NULL DEFAULT 0,
    photo_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_pet_owner_email
ON patients (lower(trim(pet_name)), lower(trim(email)));

CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    pet_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    visit_type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    staff_name TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_patient_id
ON visits(patient_id);
