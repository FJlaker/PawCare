from __future__ import annotations

from contextlib import closing
from datetime import datetime
import os
import secrets
import sqlite3
import uuid
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory, session, abort
from werkzeug.utils import secure_filename

from db import get_db_connection, init_db
from validators import validate_patient, validate_visit

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("PAWCARE_SECRET_KEY", secrets.token_hex(32)),
    SESSION_COOKIE_SECURE=os.environ.get("PAWCARE_USE_HTTPS", "").lower() in {"1", "true"},
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
)

UPLOAD_DIR = Path(app.instance_path) / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.before_request
def ensure_csrf_token():
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not app.config.get("TESTING"):
        if not request.path.startswith("/api/"):
            return
        supplied = request.headers.get("X-CSRF-Token", "")
        expected = session.get("csrf_token", "")
        if not supplied or not expected or not secrets.compare_digest(supplied, expected):
            return _error_response("CSRF validation failed.", status=403)
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)


@app.after_request
def add_security_headers(response):
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://unpkg.com https://cdn.jsdelivr.net"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.errorhandler(413)
def request_too_large(_error):
    return _error_response("The uploaded image must be no larger than 2 MB.", status=413)


def get_patient_data():
    with closing(get_db_connection()) as conn:
        rows = conn.execute(
            """
            SELECT patients.*, COUNT(visits.id) AS visitCount, MAX(visits.date) AS lastVisit
            FROM patients
            LEFT JOIN visits ON visits.patient_id = patients.id
            GROUP BY patients.id
            ORDER BY patients.id DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_visit_data(start=None, end=None):
    query = """
        SELECT visits.*, patients.species
        FROM visits
        JOIN patients ON patients.id = visits.patient_id
        WHERE (? IS NULL OR visits.date >= ?)
          AND (? IS NULL OR visits.date <= ?)
        ORDER BY visits.date DESC, visits.time DESC, visits.id DESC
    """
    with closing(get_db_connection()) as conn:
        rows = conn.execute(query, (start, start, end, end)).fetchall()
    return [dict(row) for row in rows]


def _request_data():
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        return data
    return request.form.to_dict()


def _error_response(message, errors=None, status=400):
    body = {"error": message}
    if errors is not None:
        field_names = {
            "pet_name": "petName",
            "owner_name": "ownerName",
            "neutered_spayed": "neuteredSpayed",
            "patient_id": "patientId",
            "visit_type": "visitType",
            "staff_name": "staffName",
        }
        body["errors"] = {field_names.get(field, field): text for field, text in errors.items()}
    return jsonify(body), status


def _safe_existing_photo(filename):
    if not isinstance(filename, str) or not filename:
        return None
    safe_name = secure_filename(filename)
    if safe_name != filename or Path(safe_name).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        return None
    if not (UPLOAD_DIR / safe_name).is_file():
        return None
    return safe_name


def _query_date_range():
    values = []
    for name in ("start", "end"):
        value = request.args.get(name, "").strip()
        if not value:
            values.append(None)
            continue
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None, None, f"{name.title()} must be a valid YYYY-MM-DD date."
        if parsed.isoformat() != value:
            return None, None, f"{name.title()} must be a valid YYYY-MM-DD date."
        values.append(value)
    start, end = values
    if start and end and start > end:
        return None, None, "Start date must be on or before end date."
    return start, end, None


def _month_range(start, end):
    current = datetime.strptime(start[:7], "%Y-%m").date().replace(day=1)
    last = datetime.strptime(end[:7], "%Y-%m").date().replace(day=1)
    months = []
    while current <= last:
        months.append(current.strftime("%Y-%m"))
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months


@app.route("/")
def index():
    return render_template("index.html", patients=get_patient_data())


@app.route("/directory")
def directory():
    return render_template("directory.html", patients=get_patient_data())


@app.route("/visits")
def visits():
    return render_template("visits.html", visits=get_visit_data())


@app.route("/reports")
def reports():
    return render_template("reports.html", patients=get_patient_data(), visits=get_visit_data())


@app.route("/offline")
def offline():
    return render_template("offline.html"), 200


@app.route("/manifest.webmanifest")
def manifest():
    return send_from_directory(app.static_folder, "manifest.webmanifest", mimetype="application/manifest+json")


@app.route("/sw.js")
def service_worker():
    return send_from_directory(app.static_folder, "js/sw.js", mimetype="application/javascript")


@app.route("/api/csrf-token", methods=["GET"])
def api_csrf_token():
    return jsonify({"csrfToken": session["csrf_token"]}), 200


@app.route("/api/uploads", methods=["POST"])
def api_upload():
    photo = request.files.get("photo")
    if photo is None or not photo.filename:
        return _error_response("Choose a JPEG, PNG or WebP image.", status=400)
    if photo.mimetype not in {"image/jpeg", "image/png", "image/webp"}:
        return _error_response("Only JPEG, PNG and WebP images are accepted.", status=400)

    original_name = secure_filename(photo.filename)
    original_suffix = Path(original_name).suffix.lower()
    allowed_suffixes = {
        "image/jpeg": {".jpg", ".jpeg"},
        "image/png": {".png"},
        "image/webp": {".webp"},
    }
    if original_suffix not in allowed_suffixes[photo.mimetype]:
        return _error_response("The file extension does not match the selected image type.", status=400)

    header = photo.stream.read(12)
    photo.stream.seek(0)
    valid_signature = (
        header.startswith(b"\xff\xd8\xff")
        or header.startswith(b"\x89PNG\r\n\x1a\n")
        or (header.startswith(b"RIFF") and header[8:12] == b"WEBP")
    )
    if not valid_signature:
        return _error_response("The uploaded file is not a valid supported image.", status=400)

    extension = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[photo.mimetype]
    photo.stream.seek(0, os.SEEK_END)
    size = photo.stream.tell()
    photo.stream.seek(0)
    if size > 2 * 1024 * 1024:
        return _error_response("The image must be no larger than 2 MB.", status=400)

    filename = f"{uuid.uuid4().hex}{extension}"
    photo.save(UPLOAD_DIR / filename)
    return jsonify({"success": True, "filename": filename}), 201


@app.route("/api/patients/<int:patient_id>/photo")
def api_patient_photo(patient_id):
    with closing(get_db_connection()) as conn:
        row = conn.execute(
            "SELECT photo_path FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()
    if row is None or not row["photo_path"]:
        abort(404)

    filename = secure_filename(row["photo_path"])
    if filename != row["photo_path"] or not (UPLOAD_DIR / filename).is_file():
        abort(404)
    return send_from_directory(UPLOAD_DIR, filename, mimetype={
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(Path(filename).suffix.lower(), "application/octet-stream"))


@app.route("/patients/<int:patient_id>")
def patient_detail(patient_id):
    with closing(get_db_connection()) as conn:
        row = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if row is None:
        abort(404)
    return render_template("patient_detail.html", patient=dict(row))


@app.route("/api/patients", methods=["GET"])
def api_patients_get():
    return jsonify(get_patient_data()), 200


@app.route("/api/patients", methods=["POST"])
def api_patients_post():
    data = _request_data()
    data["phone"] = "".join(str(data.get("phone", "") or "").split())
    errors = validate_patient(data)
    if errors:
        return _error_response("Validation failed.", errors)

    photo_filename = str(data.get("photo_path", "") or "").strip()
    safe_photo = _safe_existing_photo(photo_filename) if photo_filename else None
    if photo_filename and safe_photo is None:
        return _error_response("The selected photo is invalid or unavailable.", status=400)

    patient = {
        "pet_name": str(data.get("pet_name", "")).strip(),
        "species": str(data.get("species", "")).strip(),
        "breed": str(data.get("breed", "") or "").strip() or "Unknown",
        "dob": str(data.get("dob", "") or "").strip(),
        "gender": str(data.get("gender", "")).strip(),
        "owner_name": str(data.get("owner_name", "")).strip(),
        "email": str(data.get("email", "")).strip(),
        "phone": data["phone"],
        "neutered_spayed": int(str(data.get("neutered_spayed", "")).lower() in {"1", "true", "yes", "on"}),
        "photo_path": safe_photo,
    }

    try:
        with closing(get_db_connection()) as conn:
            duplicate = conn.execute(
                """
                SELECT id FROM patients
                WHERE lower(trim(pet_name)) = lower(?)
                  AND lower(trim(email)) = lower(?)
                LIMIT 1
                """,
                (patient["pet_name"], patient["email"]),
            ).fetchone()
            if duplicate:
                return _error_response(
                    "A patient with this name and owner email already exists.",
                    {"pet_name": "This pet is already registered for that owner email address."},
                    409,
                )
            cursor = conn.execute(
                """
                INSERT INTO patients (pet_name, species, breed, dob, gender, owner_name, email, phone, neutered_spayed, photo_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    patient["pet_name"], patient["species"], patient["breed"], patient["dob"],
                    patient["gender"], patient["owner_name"], patient["email"], patient["phone"],
                    patient["neutered_spayed"],
                    patient["photo_path"],
                ),
            )
            conn.commit()
            patient["id"] = cursor.lastrowid
    except sqlite3.IntegrityError:
        return _error_response("A patient with this name and owner email already exists.", status=409)

    return jsonify({"success": True, "patient": patient}), 201


@app.route("/api/patients/<int:patient_id>", methods=["GET"])
def api_patient_get(patient_id):
    with closing(get_db_connection()) as conn:
        row = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if row is None:
        return _error_response("Patient not found.", status=404)
    return jsonify(dict(row)), 200


@app.route("/api/patients/<int:patient_id>/visits", methods=["GET"])
def api_patient_visits_get(patient_id):
    with closing(get_db_connection()) as conn:
        patient = conn.execute("SELECT id FROM patients WHERE id = ?", (patient_id,)).fetchone()
        if patient is None:
            return _error_response("Patient not found.", status=404)
        rows = conn.execute(
            """
            SELECT visits.*, patients.species
            FROM visits
            JOIN patients ON patients.id = visits.patient_id
            WHERE visits.patient_id = ?
            ORDER BY visits.date DESC, visits.time DESC, visits.id DESC
            """,
            (patient_id,),
        ).fetchall()
    return jsonify([dict(row) for row in rows]), 200


@app.route("/api/visits", methods=["GET"])
def api_visits_get():
    start, end, error = _query_date_range()
    if error:
        return _error_response(error)
    return jsonify(get_visit_data(start, end)), 200


@app.route("/api/visits", methods=["POST"])
def api_visits_post():
    data = _request_data()
    errors = validate_visit(data)
    if errors:
        return _error_response("Validation failed.", errors)

    patient_id = int(data["patient_id"])
    visit = {
        "patient_id": patient_id,
        "visit_type": str(data.get("visit_type", "")).strip(),
        "date": str(data.get("date", "")).strip(),
        "time": str(data.get("time", "")).strip(),
        "notes": str(data.get("notes", "") or "").strip(),
        "staff_name": str(data.get("staff_name", "")).strip(),
    }
    with closing(get_db_connection()) as conn:
        patient = conn.execute(
            "SELECT id, pet_name, species, owner_name FROM patients WHERE id = ?",
            (patient_id,),
        ).fetchone()
        if patient is None:
            return _error_response("Patient not found.", {"patient_id": "Select an existing patient."}, 404)
        cursor = conn.execute(
            """
            INSERT INTO visits (patient_id, pet_name, owner_name, visit_type, date, time, notes, staff_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id, patient["pet_name"], patient["owner_name"], visit["visit_type"],
                visit["date"], visit["time"], visit["notes"], visit["staff_name"],
            ),
        )
        conn.commit()
        visit["id"] = cursor.lastrowid
        visit["pet_name"] = patient["pet_name"]
        visit["species"] = patient["species"]
        visit["owner_name"] = patient["owner_name"]

    return jsonify({"success": True, "visit": visit}), 201


@app.route("/api/reports/monthly", methods=["GET"])
def api_reports_monthly_get():
    start, end, error = _query_date_range()
    if error:
        return _error_response(error)

    with closing(get_db_connection()) as conn:
        bounds = conn.execute("SELECT MIN(date), MAX(date) FROM visits").fetchone()
        earliest, latest = bounds[0], bounds[1]
        if not start and not end and not earliest:
            return jsonify([]), 200
        if start and not end:
            end = max(latest or start, start)
        elif end and not start:
            start = min(earliest or end, end)
        else:
            start = start or earliest
            end = end or latest
        if not start or not end:
            return jsonify([]), 200
        if start > end:
            return _error_response("Start date must be on or before end date.")

        counts = conn.execute(
            """
            SELECT substr(date, 1, 7) AS month, COUNT(*) AS visits
            FROM visits
            WHERE date >= ? AND date <= ?
            GROUP BY substr(date, 1, 7)
            ORDER BY month
            """,
            (start, end),
        ).fetchall()
    count_by_month = {row["month"]: row["visits"] for row in counts}
    return jsonify([
        {"month": month, "visits": count_by_month.get(month, 0)}
        for month in _month_range(start, end)
    ]), 200


@app.route("/api/reports/summary", methods=["GET"])
def api_reports_summary_get():
    with closing(get_db_connection()) as conn:
        patients = conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        visits = conn.execute("SELECT COUNT(*) FROM visits").fetchone()[0]
        today = datetime.now().strftime("%Y-%m-%d")
        todays_visits = conn.execute(
            "SELECT COUNT(*) FROM visits WHERE date = ?", (today,)
        ).fetchone()[0]
        open_cases = conn.execute(
            "SELECT COUNT(*) FROM visits WHERE visit_type IN ('Emergency', 'Surgery follow-up')"
        ).fetchone()[0]
    return jsonify({
        "patients": patients,
        "visits": visits,
        "todaysVisits": todays_visits,
        "openCases": open_cases,
    }), 200


if __name__ == "__main__":
    init_db()
    app.run(debug=False, use_reloader=False)
