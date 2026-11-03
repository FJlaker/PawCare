import io
import os
import tempfile
import unittest
from pathlib import Path

import db
import app as app_module


class PawCareDbTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.original_db_path = db.DB_PATH
        db.DB_PATH = os.path.join(self.temp_dir, "pawcare.db")
        self.original_upload_dir = app_module.UPLOAD_DIR
        app_module.UPLOAD_DIR = Path(self.temp_dir) / "uploads"
        app_module.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        app_module.app.config['TESTING'] = True
        app_module.init_db()

    def tearDown(self):
        db.DB_PATH = self.original_db_path
        app_module.UPLOAD_DIR = self.original_upload_dir

    def test_patient_post_persists_to_database(self):
        client = app_module.app.test_client()

        conn = db.get_db_connection()
        initial_count = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
        conn.close()

        response = client.post(
            '/api/patients',
            json={
                'pet_name': 'Luna',
                'species': 'Dog',
                'breed': 'Poodle',
                'dob': '2024-01-14',
                'gender': 'Female',
                'neutered_spayed': True,
                'owner_name': 'Jane Smith',
                'email': 'jane@example.com',
                'phone': '0400 222 333',
            },
        )

        self.assertEqual(response.status_code, 201)

        conn = db.get_db_connection()
        rows = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
        conn.close()

        self.assertEqual(rows, initial_count + 1)

    def test_database_foreign_key_and_visit_index(self):
        conn = db.get_db_connection()
        foreign_keys = conn.execute(
            "PRAGMA foreign_key_list(visits)"
        ).fetchall()
        indexes = conn.execute(
            "PRAGMA index_list(visits)"
        ).fetchall()
        conn.close()

        self.assertTrue(any(row["table"] == "patients" and row["from"] == "patient_id" for row in foreign_keys))
        index_names = {row["name"] for row in indexes}
        self.assertIn("idx_visits_patient_id", index_names)

    def test_pwa_assets_and_offline_route(self):
        client = app_module.app.test_client()

        manifest = client.get("/manifest.webmanifest")
        self.assertEqual(manifest.status_code, 200)
        self.assertIn("PawCare", manifest.get_json()["name"])

        worker = client.get("/sw.js")
        self.assertEqual(worker.status_code, 200)
        self.assertIn("pawcare-shell-v2", worker.get_data(as_text=True))

        offline = client.get("/offline")
        self.assertEqual(offline.status_code, 200)
        self.assertIn(b"You are offline", offline.data)

    def test_security_controls_reject_csrf_injection_and_invalid_upload(self):
        original_testing = app_module.app.config["TESTING"]
        app_module.app.config["TESTING"] = False
        client = app_module.app.test_client()
        try:
            payload = {
                "pet_name": "Luna",
                "species": "Cat",
                "breed": "Poodle",
                "dob": "2024-01-14",
                "gender": "Female",
                "neutered_spayed": True,
                "owner_name": "Jane Smith",
                "email": "security-test@example.com",
                "phone": "0822223344",
            }
            missing_csrf = client.post("/api/patients", json=payload)
            self.assertEqual(missing_csrf.status_code, 403)

            token_response = client.get("/api/csrf-token")
            csrf_token = token_response.get_json()["csrfToken"]
            valid_csrf = client.post(
                "/api/patients",
                json=payload,
                headers={"X-CSRF-Token": csrf_token},
            )
            self.assertIn(valid_csrf.status_code, {201, 409})

            sql_payload = client.post(
                "/api/patients",
                json={**payload, "pet_name": "X' OR 1=1--"},
                headers={"X-CSRF-Token": csrf_token},
            )
            self.assertEqual(sql_payload.status_code, 400)

            xss_payload = client.post(
                "/api/patients",
                json={**payload, "owner_name": "<script>alert(1)</script>"},
                headers={"X-CSRF-Token": csrf_token},
            )
            self.assertEqual(xss_payload.status_code, 400)

            invalid_upload = client.post(
                "/api/uploads",
                data={"photo": (io.BytesIO(b"not an image"), "report.txt", "text/plain")},
                headers={"X-CSRF-Token": csrf_token},
                content_type="multipart/form-data",
            )
            self.assertEqual(invalid_upload.status_code, 400)

            valid_upload = client.post(
                "/api/uploads",
                data={"photo": (io.BytesIO(b"\x89PNG\r\n\x1a\nsecure-test"), "pet-photo.png", "image/png")},
                headers={"X-CSRF-Token": csrf_token},
                content_type="multipart/form-data",
            )
            self.assertEqual(valid_upload.status_code, 201)
            filename = valid_upload.get_json()["filename"]
            photo_patient = client.post(
                "/api/patients",
                json={**payload, "email": "photo-test@example.com", "photo_path": filename},
                headers={"X-CSRF-Token": csrf_token},
            )
            self.assertEqual(photo_patient.status_code, 201)
            patient_id = photo_patient.get_json()["patient"]["id"]
            self.assertEqual(client.get(f"/api/patients/{patient_id}/photo").status_code, 200)
            self.assertEqual(client.get(f"/patients/{patient_id}").status_code, 200)

            protected = client.get("/")
            self.assertEqual(protected.headers["X-Content-Type-Options"], "nosniff")
            self.assertIn("default-src 'self'", protected.headers["Content-Security-Policy"])
        finally:
            app_module.app.config["TESTING"] = original_testing


if __name__ == '__main__':
    unittest.main()
