import io
import os
import tempfile
import unittest
from pathlib import Path

import app_v1_fixed as fixed_module


class FixedAppSecurityTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        fixed_module.DATABASE = Path(self.temp_dir.name) / "fixit.db"
        fixed_module.UPLOAD_DIR = Path(self.temp_dir.name) / "uploads"
        fixed_module.UPLOAD_DIR.mkdir()
        fixed_module.app.config.update(TESTING=True, FIXIT_TESTING=True)
        self.client = fixed_module.app.test_client()

        with fixed_module.get_db() as conn:
            conn.execute(
                "CREATE TABLE reports (id INTEGER PRIMARY KEY, street TEXT, category TEXT, status TEXT)"
            )
            conn.execute(
                "INSERT INTO reports VALUES (1, 'Oak Street', 'Water', 'Open')"
            )
            conn.commit()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_parameterized_search_rejects_sql_payload(self):
        response = self.client.get("/search?street=X%27%20OR%201%3D1--")
        self.assertEqual(response.status_code, 400)

    def test_search_output_autoescapes_html(self):
        response = self.client.get("/search?street=%3Cscript%3Ealert(1)%3C/script%3E")
        self.assertEqual(response.status_code, 400)

    def test_close_requires_authentication_and_csrf(self):
        unauthenticated = self.client.post("/report/1/close")
        self.assertEqual(unauthenticated.status_code, 403)

        with self.client.session_transaction() as session:
            session["coordinator_authenticated"] = True
        missing_csrf = self.client.post("/report/1/close")
        self.assertEqual(missing_csrf.status_code, 403)

        with self.client.session_transaction() as session:
            csrf_token = session["csrf_token"]
        valid_csrf = self.client.post(
            "/report/1/close",
            data={"csrf_token": csrf_token},
        )
        self.assertEqual(valid_csrf.status_code, 200)

    def test_upload_rejects_traversal_name_and_invalid_content(self):
        response = self.client.post(
            "/upload",
            data={
                "photo": (
                    io.BytesIO(b"not an image"),
                    "../../fixit.db",
                    "text/plain",
                )
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)

    def test_security_headers_are_present(self):
        response = self.client.get("/search?street=Oak%20Street")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])


if __name__ == "__main__":
    unittest.main()
