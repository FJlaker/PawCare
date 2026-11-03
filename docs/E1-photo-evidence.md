# E1: Secure Photo Upload and Retrieval

## Implementation

PawCare stores one optional photo for each patient record:

- The Add Patient form accepts JPEG, PNG and WebP files with a maximum size of 2 MB.
- `POST /api/uploads` requires the existing session CSRF token.
- The server checks the original filename extension, declared MIME type, image signature and file size.
- Uploaded names use a UUID plus a validated extension. `secure_filename` removes unsafe characters and prevents caller-controlled paths.
- Files are stored in the Flask instance `uploads` folder, outside `templates`.
- The database stores only the generated filename in the `patients.photo_path` column.
- The patient directory displays a 44-pixel thumbnail from `/api/patients/<id>/photo`.
- `/patients/<id>` displays the full photo with descriptive alt text.

## Storage Choice

Storing the file separately and saving its path is better than storing the image bytes in SQLite. Files remain streamable, browsers and operating systems manage them efficiently, database size and backup time stay lower, and the database avoids large binary values that slow ordinary patient queries. The path is a small, indexed relational value that retains the association between the patient and their photo.

## Verification

Automated tests cover:

- rejection of mismatched MIME/signature data;
- successful JPEG/PNG/WebP-style signature upload;
- database storage of the generated filename;
- thumbnail/full-photo route responses;
- patient detail rendering.
