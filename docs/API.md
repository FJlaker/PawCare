# PawCare REST API

All endpoints return JSON. Dates use `YYYY-MM-DD`; times use `HH:MM`. Patient and visit fields are validated against the PawCare data rules. A validation error uses HTTP 400 and returns one message per invalid field.

## Endpoint summary

| Method | URL | Success status | Other expected statuses |
|---|---|---:|---|
| GET | `/api/patients` | 200 | - |
| POST | `/api/patients` | 201 | 400, 409 |
| GET | `/api/patients/<id>` | 200 | 404 |
| GET | `/api/patients/<id>/visits` | 200 | 404 |
| GET | `/api/visits` | 200 | 400 |
| POST | `/api/visits` | 201 | 400, 404 |
| GET | `/api/reports/monthly` | 200 | 400 |
| GET | `/api/reports/summary` | 200 | - |
| GET/POST | `/api/csrf-token` | 200/405 | - |
| POST | `/api/uploads` | 201 | 400, 413 |
| GET | `/api/patients/<id>/photo` | 200 | 404 |

## Error response format

Client validation errors and API errors use JSON:

```json
{
  "error": "Validation failed.",
  "errors": {
    "petName": "Enter a valid email address."
  }
}
```

Missing resources use a simple JSON message:

```json
{"error": "Patient not found."}
```

## `GET /api/patients`
Returns all patients, newest record first. Each record includes `visitCount` and `lastVisit` (`null` when the patient has no visits).

Status: `200`

Example:

```json
[
  {
    "id": 1,
    "pet_name": "Bella",
    "species": "Dog",
    "breed": "Labrador",
    "dob": "2022-04-12",
    "gender": "Female",
    "neutered_spayed": 1,
    "owner_name": "Sarah Johnson",
    "email": "sarah@example.com",
    "phone": "0412345678",
    "visitCount": 3,
    "lastVisit": "2026-07-05"
  }
]
```

## `POST /api/patients`
Registers a patient. Required JSON fields: `pet_name`, `species`, `gender`, `neutered_spayed`, `owner_name`, `email`, and `phone`. `breed` and `dob` are optional. Phone whitespace is removed before storage.

Statuses: `201` created, `400` invalid fields, `409` duplicate pet name and owner email.

Example request:

```json
{
  "pet_name": "Tilly",
  "species": "Rabbit",
  "breed": "Mini Lop",
  "dob": "2024-01-14",
  "gender": "Female",
  "neutered_spayed": false,
  "owner_name": "Test Owner",
  "email": "test@example.co.za",
  "phone": "082 222 3344"
}
```

Example response (`201`):

```json
{
  "success": true,
  "patient": {
    "id": 7,
    "pet_name": "Tilly",
    "species": "Rabbit",
    "breed": "Mini Lop",
    "dob": "2024-01-14",
    "gender": "Female",
    "neutered_spayed": 0,
    "owner_name": "Test Owner",
    "email": "test@example.co.za",
    "phone": "0822223344"
  }
}
```

Example validation response (`400`):

```json
{
  "error": "Validation failed.",
  "errors": {
    "petName": "Enter 2-40 letters, spaces, hyphens or apostrophes, starting with a letter.",
    "email": "Enter a valid email address."
  }
}
```

## `GET /api/patients/<id>`
Returns one patient by numeric ID. Statuses: `200` found, `404` not found.

Example response (`200`):

```json
{
  "id": 1,
  "pet_name": "Bella",
  "species": "Dog",
  "breed": "Labrador",
  "dob": "2022-04-12",
  "gender": "Female",
  "neutered_spayed": 1,
  "owner_name": "Sarah Johnson",
  "email": "sarah@example.com",
  "phone": "0412345678"
}
```

Example `404`:

```json
{"error": "Patient not found."}
```

## `GET /api/patients/<id>/visits`
Returns that patient's visit history, newest first, including pet name, species, owner, visit type, time, notes and staff name. Statuses: `200` patient found (an empty array is valid), `404` patient not found.

Example response (`200`):

```json
[
  {
    "id": 12,
    "patient_id": 1,
    "date": "2026-07-05",
    "time": "09:30",
    "pet_name": "Bella",
    "species": "Dog",
    "owner_name": "Sarah Johnson",
    "visit_type": "Annual checkup",
    "notes": "",
    "staff_name": "Alex Morgan"
  }
]
```

## `GET /api/visits?start=YYYY-MM-DD&end=YYYY-MM-DD`
Both date parameters are optional. Returns newest visits first, including `patient_id`, date, time, pet name, species, owner, visit type, notes, and staff name. Statuses: `200` success, `400` invalid date or start after end.

Example response (`200`):

```json
[
  {
    "id": 31,
    "patient_id": 1,
    "date": "2026-09-30",
    "time": "10:30",
    "pet_name": "Bella",
    "species": "Dog",
    "owner_name": "Sarah Johnson",
    "visit_type": "Consultation",
    "notes": "Follow-up",
    "staff_name": "Alex Morgan"
  }
]
```

## `POST /api/visits`
Records a visit using an existing numeric `patient_id`. Required fields: `patient_id`, `date`, `visit_type`, `time`, and `staff_name`; `notes` is optional and limited to 200 characters. Pet and owner names are obtained from the referenced patient.

Statuses: `201` created, `400` invalid fields, `404` patient does not exist.

Example request:

```json
{
  "patient_id": 1,
  "date": "2026-09-30",
  "time": "10:30",
  "visit_type": "Consultation",
  "notes": "Follow-up",
  "staff_name": "Alex Morgan"
}
```

Example response (`201`):

```json
{
  "success": true,
  "visit": {
    "id": 31,
    "patient_id": 1,
    "pet_name": "Bella",
    "species": "Dog",
    "owner_name": "Sarah Johnson",
    "date": "2026-09-30",
    "time": "10:30",
    "visit_type": "Consultation",
    "notes": "Follow-up",
    "staff_name": "Alex Morgan"
  }
}
```

## `GET /api/reports/monthly?start=YYYY-MM-DD&end=YYYY-MM-DD`
Both bounds are optional. Returns `{ "month": "YYYY-MM", "visits": number }` objects, including months with zero visits. Statuses: `200` success, `400` invalid date or start after end.

Example:

```json
[
  {"month": "2026-06", "visits": 5},
  {"month": "2026-07", "visits": 0}
]
```

## `GET /api/reports/summary`
Returns live dashboard totals. The response is read-only and is not cached by the service worker.

```json
{
  "patients": 6,
  "visits": 30,
  "todayVisits": 0,
  "openCases": 4
}
```

## `POST /api/uploads`
Accepts `multipart/form-data` with a single `photo` field. The image must be JPEG, PNG or WebP, have a matching extension, contain a valid binary image signature and be no larger than 2 MB. A CSRF token header is required:

```text
X-CSRF-Token: <session-token>
```

Success returns HTTP `201` with a generated UUID filename:

```json
{"success": true, "filename": "c1fe...jpg"}
```

Rejected MIME types, extensions and signatures return `400`; oversized uploads return `413`.

## `GET /api/patients/<id>/photo`
Returns the patient's stored JPEG, PNG or WebP image at HTTP `200`. A patient without an approved photo or an unknown patient ID returns `404`.

## Testing

Start Flask and open `tests/api.http` in VS Code with the REST Client extension. The file covers success responses and failing requests, including:

- Invalid patient data: `POST /api/patients` returns `400`.
- Duplicate patient: `POST /api/patients` returns `409`.
- Missing patient: `GET /api/patients/999999` returns `404`.
- Reversed or malformed date ranges: `GET /api/visits` returns `400`.
- Missing patient reference: `POST /api/visits` returns `404`.
- Invalid visit fields: `POST /api/visits` returns `400`.
- Invalid monthly report range: `GET /api/reports/monthly` returns `400`.

Automated coverage is run with:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The automated suite verifies all endpoint groups, JSON status codes, validation, database persistence, monthly empty months, and not-found responses. Save REST Client response screenshots in `docs/screenshots` using the filenames and cases listed in `docs/screenshots/README.md`.
