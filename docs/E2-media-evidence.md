# E2: JSON API, Video and Format Choices

## JSON dashboard API

The read-only endpoint is `GET /api/reports/summary`. It returns patient count, visit count, today's visits and follow-up/emergency cases as JSON. The Attendance Reports dashboard uses JavaScript `fetch()` through the PawCare API wrapper and updates four summary cards.

Example response:

```json
{
  "patients": 6,
  "visits": 30,
  "todaysVisits": 0,
  "openCases": 10
}
```

## Tutorial video

The Add Patient page embeds an original local PawCare tutorial using HTML5 `<video>`. It provides MP4 and WebM sources plus a WebVTT English caption track so supported browsers can select the best source or displayed captions.

## Format choices

| Media/data | Selected format | Alternatives considered | Why this choice |
|---|---|---|---|
| Dashboard data | JSON | XML | JSON is compact, browser-native through JavaScript, and works directly with Fetch and Flask/Jinja. XML has more verbose syntax and requires additional parsing. |
| Patient photos | JPEG/PNG/WebP | Storing binary in SQLite, BMP | Web formats are compact, browser-supported and stored outside the database as paths. WebP generally offers efficient size, JPEG suits photographs, PNG supports lossless detail, while BMP is too large. |
| Tutorial video | MP4 and WebM | AVI, HLS streaming | MP4 provides broad device support; WebM provides an open alternative with good browser support. AVI has poor web delivery characteristics. HLS offers adaptive streaming but is unnecessary for this short local tutorial. |
| Captions | WebVTT | SRT, burned-in captions | WebVTT is supported by HTML5 `<video>`, remains editable, can be styled, and makes text available to screen readers and users who cannot hear audio. SRT needs conversion and burned-in captions cannot be disabled. |
