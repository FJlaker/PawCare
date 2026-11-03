# PawCare

A Flask, SQLite and JavaScript application for registering animal patients, recording clinic visits and reviewing attendance reports.

This PawCare implementation is the equivalent clinic adaptation of the Ward 42 Fix-It SS3 project. The
application demonstrates Flask routing, SQLite persistence, REST JSON APIs, Bootstrap responsive layouts,
JavaScript/React interactivity, PWA delivery, secure uploads and dashboard analytics.

GitHub repository: https://github.com/FJlaker/PawCare

## Features

- Register and validate animal patients with optional JPEG, PNG or WebP photos.
- Record patient visits and show patient visit histories.
- Filter attendance reports in the browser and retrieve dashboard totals as JSON.
- Use SQLite foreign keys and parameterised database queries.
- Protect data-changing API requests with CSRF validation and security response headers.
- Install PawCare as a PWA and view a custom offline page without connectivity.
- Play tutorial media from MP4 and WebM sources with WebVTT English captions.

## Requirements

- Python 3.12 or later
- Flask and Flask dependencies listed in `requirements.txt`
- A modern browser such as Chrome or Edge for PWA and Lighthouse testing

## Setup

1. Install Python 3.12 or later.
2. From the project folder, create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install Flask:

   ```powershell
   python -m pip install -r requirements.txt
   ```
4. Create or upgrade the SQLite database and load sample data:

   ```powershell
   python -c "from db import init_db; init_db()"
   ```
5. Start the application:

   ```powershell
   python app.py
   ```
6. Open `http://127.0.0.1:5000`.

The first database setup creates six fictitious sample patients and sample visits. `init_db()` is safe
to run again and applies additive schema updates. Do not commit `pawcare.db`, `.venv`, `instance/uploads`
or environment secret values.

### Optional HTTPS configuration

Set a persistent secret and HTTPS mode before deploying:

```powershell
$env:PAWCARE_SECRET_KEY = "<generate-a-random-secret>"
$env:PAWCARE_USE_HTTPS = "1"
python app.py
```

Generate a secret externally with Python:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

## Testing

Run the automated suite:

```powershell
python -m unittest discover -s tests -v
```

Start the Flask server and open `tests/api.http` with VS Code REST Client to exercise endpoints manually.
`tests/security_tests.http` contains SQL-injection-shaped, XSS-shaped, missing-CSRF and invalid-upload
requests. Endpoint details are documented in [docs/API.md](docs/API.md).

## Coordinator/Staff Access

PawCare uses a staff-name cookie for the clinic staff workflow; it does not implement the Ward 42
coordinator login account model. The Fix-It equivalent would require a coordinators table containing
a password hash, Flask login/session protection, and CSRF-protected status update routes. No plain-text
test password should be committed to this repository.

## PWA Installation and Offline Behavior

PawCare provides an installable web-app manifest and a service worker. The browser registers the worker after a page loads and caches the application shell and previously visited navigation pages. When the clinic server is unavailable, navigation falls back to the offline page, and API requests continue to require a live connection so patient and visit records are not silently saved only in the browser. This design preserves SQLite as the authoritative clinic database instead of using localStorage for offline clinical records.

To test installation, run PawCare over localhost or HTTPS, open Chrome or Edge DevTools, and use the Application panel to inspect the Manifest and Service Workers sections. Verify registration, test an offline reload, then choose Install app from the address bar. The manifest includes 192 px and 512 px install icons.

C2 multi-device evidence, Lighthouse scores, viewport screenshots, and data-saving decisions are documented in [docs/c2-usability.md](docs/c2-usability.md).

D2 security implementation and evidence are documented in [docs/D2-security-evidence.md](docs/D2-security-evidence.md). Attack-style requests are available in [tests/security_tests.http](tests/security_tests.http).

E1 photo upload, storage, thumbnail and full-image retrieval evidence are documented in [docs/E1-photo-evidence.md](docs/E1-photo-evidence.md).

E2 JSON API, tutorial video, captions and format choices are documented in [docs/E2-media-evidence.md](docs/E2-media-evidence.md).

The system diagram, component technologies, and numbered save-patient/request flows are documented in [docs/architecture.md](docs/architecture.md). A visual summary is also available in [docs/architecture.png](docs/architecture.png).

## Hosting Recommendation

The association should use a managed Flask/Python hosting platform with persistent SQLite storage, HTTPS,
environment-secret support and persistent file storage for uploads, subject to privacy and POPIA review.
SQLite is suitable for initial low-volume use, but production volume or multiple app instances should
move to a managed relational database. GitHub Pages cannot host this application because it only serves
static HTML, CSS and JavaScript. It has no Python/Flask execution environment, SQLite server or writable
image-storage service for POST requests and sessions.

## Phase 7 Demo Video
Prepare one narrated demonstration video no longer than five minutes. The recording must show patient registration with a validation error, visit recording, attendance filtering, Patient Directory use, and a brief explanation of one Flask route and one React component. Export it as MP4 and place the final file in the Phase 7 submission package; project MP4/WebM tutorial assets remain in `static/video`.

## Why Validate in Both Places

Browser validation improves usability. It can identify a missing name, malformed phone number, future date or oversized note as soon as staff interact with the form, explain the specific correction, and avoid an unnecessary request. It is not a security boundary: users can disable JavaScript, alter a request in developer tools, or call an endpoint directly. The server therefore validates every submitted field again before touching SQLite. It is authoritative because all clients, not only PawCare’s pages, must follow the same data rules. Server checks also verify database-dependent conditions such as whether a patient exists and whether the pet name and owner email combination is already registered. Parameterized SQL prevents user values from becoming executable SQL, while the foreign key keeps visit relationships valid. Keeping both layers aligned gives staff immediate feedback without trusting browser-controlled data, and gives the database consistent records regardless of how a request was sent.

## Front-End Accessibility and Responsiveness

The shared Jinja layout uses semantic header, navigation, main and footer landmarks, plus a skip link for keyboard users. Every visible form field has a label, required inputs use native validation attributes, and server or browser field errors are exposed through `aria-invalid`, error descriptions and live regions. Status and alert messages announce successful saves, loading states and failures without relying on colour alone. The tables include captions or column headers and horizontal scrolling on small screens. The patient directory also names visit-history controls for their patient.

Bootstrap grid classes provide responsive layouts for phones, tablets and desktop screens. PawCare styles keep buttons usable on narrow screens, provide a visible keyboard focus indicator, preserve table access with overflow containers, and disable motion for users who prefer reduced motion.
