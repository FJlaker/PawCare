# A2 REST and HTTP Evidence

Use the VS Code REST Client file [../tests/api.http](../tests/api.http) while Flask is running.
Capture each successful or expected failure response with its request URL and status visible.

## Required evidence checklist

| Evidence | Request | Expected status |
|---|---|---:|
| Patient list | `GET /api/patients` | `200` |
| Patient created | Valid `POST /api/patients` | `201` |
| Invalid patient | Invalid `POST /api/patients` | `400` |
| Patient not found | `GET /api/patients/999999` | `404` |
| Invalid visit range | Reversed `GET /api/visits` dates | `400` |
| Missing patient visit | `POST /api/visits` with unknown patient | `404` |
| Monthly report | `GET /api/reports/monthly` with valid dates | `200` |
| Summary API | `GET /api/reports/summary` | `200` |
| Photo upload rejected | Invalid `POST /api/uploads` | `400` |

Save screenshots in [screenshots/](screenshots/). Use the filenames and content layout in [screenshots/README.md](screenshots/README.md).
