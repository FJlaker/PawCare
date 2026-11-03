import os
import re
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    abort,
    jsonify,
    render_template,
    request,
    session,
)

app = Flask(__name__)
app.secret_key = os.environ.get("FIXIT_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
)

DATABASE = Path("fixit.db")
UPLOAD_DIR = Path("uploads").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.before_request
def create_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)


def require_coordinator(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if session.get("coordinator_authenticated") is not True:
            abort(403)
        return view(*args, **kwargs)
    return wrapped


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.route("/search")
def search():
    street = request.args.get("street", "").strip()
    if len(street) > 100 or (street and not re.fullmatch(r"[A-Za-z0-9 .'-]+", street)):
        abort(400)

    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, category, status FROM reports WHERE street = ?",
            (street,),
        ).fetchall()

    return render_template("search.html", street=street, rows=rows)


@app.route("/report/<int:report_id>/close", methods=["POST"])
@require_coordinator
def close_report(report_id):
    supplied = request.form.get("csrf_token", "")
    expected = session.get("csrf_token", "")
    if not secrets.compare_digest(supplied, expected):
        abort(403)

    with get_db() as conn:
        conn.execute(
            "UPDATE reports SET status = 'Closed' WHERE id = ?",
            (report_id,),
        )

    return "Report closed"


def validate_image(photo):
    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if photo.mimetype not in allowed_types:
        return None

    header = photo.stream.read(12)
    photo.stream.seek(0)
    is_jpeg = header.startswith(b"\xff\xd8\xff")
    is_png = header.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_webp):
        return None

    if photo.content_length is not None and photo.content_length > 2 * 1024 * 1024:
        return None
    photo.stream.seek(0, os.SEEK_END)
    size = photo.stream.tell()
    photo.stream.seek(0)
    if size > 2 * 1024 * 1024:
        return None
    return allowed_types[photo.mimetype]


@app.route("/upload", methods=["POST"])
def upload():
    photo = request.files.get("photo")
    if photo is None or not photo.filename:
        abort(400, "Choose an image to upload.")

    extension = validate_image(photo)
    if extension is None:
        abort(400, "Upload a JPEG, PNG or WebP image smaller than 2 MB.")

    filename = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    photo.save(destination)
    return jsonify({"photo_path": os.path.relpath(destination, Path.cwd())}), 201


@app.after_request
def add_security_headers(response):
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
