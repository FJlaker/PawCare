# D2: PawCare Security Evidence

## Server-side validation

Patient and visit requests are validated again in `validators.py` before SQLite is changed. The API routes call `validate_patient` or `validate_visit`; browser validation in JavaScript is intentionally advisory. Direct API clients therefore receive field-named HTTP 400 responses for malformed names, emails, phones, dates, times, species, visit types and notes.

## Parameterized database queries

SQLite user values are supplied through placeholders and argument tuples. Relevant examples include:

- `app.py` patient lookup and insertion.
- `app.py` duplicate checks.
- Visit patient lookup and insertion.
- Report date filtering and monthly aggregation.
- All patient ID and visit ID routes.

No application query interpolates request data using an SQL string. The patient, visit and report routes preserve parameterized predicates and SQLite placeholders.

## CSRF protection

Every browser data-changing API request fetches `/api/csrf-token` and sends the token as `X-CSRF-Token`. The server stores the generated token in an HTTP-only Flask session and compares it using `secrets.compare_digest` before accepting POST, PUT, PATCH or DELETE requests to `/api/*`. This protects patient creation, visit creation and upload operations.

## Secure sessions and headers

Flask sessions use:

- `SESSION_COOKIE_HTTPONLY=True`
- `SESSION_COOKIE_SAMESITE="Lax"`
- `SESSION_COOKIE_SECURE=True` when `PAWCARE_USE_HTTPS=1` is configured
- An environment-provided `PAWCARE_SECRET_KEY`, or an ephemeral secure key for local development

Responses include a Content Security Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and `Permissions-Policy`.

## Invalid-input evidence

`tests/security_tests.http` contains four-plus attack-style requests:

1. SQL injection-shaped pet name.
2. Script/XSS-shaped owner name.
3. Patient POST with a missing CSRF token.
4. Invalid text/plain upload with an image filename.

The automated security test in `test_app.py` verifies rejection of missing CSRF tokens, SQL-shaped input, XSS-shaped input, invalid upload MIME/type data, and the two security headers.
