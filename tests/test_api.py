import os
import tempfile
import unittest

import app as app_module
import db


class PawCareApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = db.DB_PATH
        db.DB_PATH = os.path.join(self.temp_dir.name, "pawcare.db")
        app_module.app.config["TESTING"] = True
        db.init_db()
        self.client = app_module.app.test_client()

    def tearDown(self):
        db.DB_PATH = self.original_db_path
        self.temp_dir.cleanup()

    @staticmethod
    def valid_patient(**overrides):
        patient = {
            "pet_name": "Tilly",
            "species": "Rabbit",
            "breed": "Mini Lop",
            "dob": "2024-01-14",
            "gender": "Female",
            "neutered_spayed": False,
            "owner_name": "Test Owner",
            "email": "tilly-test@example.co.za",
            "phone": "082 222 3344",
        }
        patient.update(overrides)
        return patient

    @staticmethod
    def valid_visit(**overrides):
        visit = {
            "patient_id": 1,
            "date": "2026-09-30",
            "time": "10:30",
            "visit_type": "Consultation",
            "notes": "Follow-up",
            "staff_name": "Alex Morgan",
        }
        visit.update(overrides)
        return visit

    def test_patient_list_and_single_patient_routes(self):
        response = self.client.get("/api/patients")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.get_json()), 6)
        self.assertIn("visitCount", response.get_json()[0])
        self.assertIn("lastVisit", response.get_json()[0])

        patient = self.client.get("/api/patients/1")
        self.assertEqual(patient.status_code, 200)
        self.assertEqual(patient.get_json()["pet_name"], "Bella")
        self.assertEqual(self.client.get("/api/patients/999999").status_code, 404)

        history = self.client.get("/api/patients/1/visits")
        self.assertEqual(history.status_code, 200)
        history_rows = history.get_json()
        history_dates = [visit["date"] for visit in history_rows]
        self.assertEqual(history_dates, sorted(history_dates, reverse=True))
        patient_summary = next(item for item in response.get_json() if item["id"] == 1)
        self.assertEqual(patient_summary["visitCount"], len(history_rows))
        self.assertEqual(patient_summary["lastVisit"], history_dates[0])
        self.assertEqual(self.client.get("/api/patients/999999/visits").status_code, 404)

    def test_patient_post_validation_creation_and_duplicate(self):
        invalid = self.client.post("/api/patients", json=self.valid_patient(pet_name="1"))
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("petName", invalid.get_json()["errors"])

        created = self.client.post("/api/patients", json=self.valid_patient())
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.get_json()["patient"]["phone"], "0822223344")

        duplicate = self.client.post("/api/patients", json=self.valid_patient(pet_name=" tIlLy "))
        self.assertEqual(duplicate.status_code, 409)

    def test_visit_get_filter_validation_and_creation(self):
        response = self.client.get("/api/visits?start=2026-07-01&end=2026-07-31")
        self.assertEqual(response.status_code, 200)
        visits = response.get_json()
        self.assertTrue(visits)
        self.assertIn("species", visits[0])
        self.assertTrue(all("2026-07-" in visit["date"] for visit in visits))
        self.assertEqual(self.client.get("/api/visits?start=bad").status_code, 400)
        self.assertEqual(
            self.client.get("/api/visits?start=2026-08-01&end=2026-07-01").status_code,
            400,
        )

        created = self.client.post("/api/visits", json=self.valid_visit())
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.get_json()["visit"]["staff_name"], "Alex Morgan")

        missing = self.client.post("/api/visits", json=self.valid_visit(patient_id=999999))
        self.assertEqual(missing.status_code, 404)
        invalid = self.client.post("/api/visits", json=self.valid_visit(visit_type="Grooming"))
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("visitType", invalid.get_json()["errors"])

    def test_monthly_report_fills_empty_months_and_validates_range(self):
        response = self.client.get("/api/reports/monthly?start=2026-01-01&end=2026-06-30")
        self.assertEqual(response.status_code, 200)
        months = response.get_json()
        self.assertEqual([month["month"] for month in months], [
            "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
        ])
        self.assertEqual(months[0]["visits"], 0)
        self.assertEqual(months[1]["visits"], 0)
        self.assertEqual(
            self.client.get("/api/reports/monthly?start=2026-10-01&end=2026-02-01").status_code,
            400,
        )

    def test_report_summary_is_read_only_json(self):
        response = self.client.get("/api/reports/summary")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, "application/json")
        summary = response.get_json()
        self.assertGreaterEqual(summary["patients"], 6)
        self.assertGreaterEqual(summary["visits"], 30)
        self.assertIn("todaysVisits", summary)
        self.assertIn("openCases", summary)


if __name__ == "__main__":
    unittest.main()
