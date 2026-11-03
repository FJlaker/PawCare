# Browser Storage Analysis

Cookies, localStorage and sessionStorage keep browser data, but differ in capacity, lifetime, scope and how requests use them. A cookie is a small name-value pair; browsers commonly limit an individual cookie to about 4 KB, with additional limits on the number stored. Its expiry and path/domain attributes control lifetime and where it applies. Matching cookies are automatically included in HTTP requests, so they should remain small and should not hold clinic records (Mozilla, n.d.-a).

Web Storage provides more capacity, commonly about 5 MiB each for localStorage and sessionStorage per origin, although browser quotas can vary. Both are scoped to the page’s origin and are accessible to JavaScript; unlike cookies, their contents are not automatically sent with each request. localStorage persists across browser restarts until the user or application clears it. PawCare uses it for the Phase 5 patient and visit arrays, including seeded demonstration records, because the assignment requires browser-side persistence. Its JSON is parsed and written through guarded functions so malformed data or a storage exception does not crash the page. sessionStorage is also origin-scoped, but belongs to the current tab and is cleared when that tab closes. PawCare uses it for the report’s start and end dates: the filter survives a reload in the same tab without becoming a long-term preference (Mozilla, n.d.-b).

The staffName cookie is a deliberate, limited exception: it stores only the staff member’s display name for 30 days, with path=/ and SameSite=Lax, allowing every page to show the active name and associate visits with it. Because JavaScript must read it, this demonstration cookie is not HttpOnly; it is not an authentication credential and must not be treated as proof of identity.

localStorage is not appropriate for real patient or owner records. First, any script running on the origin can read it, so a cross-site scripting flaw could expose names, contact details and visit history. Second, browser storage is not protected by staff-level authorization or encryption at rest and may remain on a shared or lost device. Third, it is tied to one browser profile, with no dependable central backup, audit trail, concurrency control or cross-device synchronization. Finally, browser quotas, user clearing and device failure make it unsuitable as the authoritative record. A real clinic should use an access-controlled server database, secure transport, audited access and an appropriate retention and backup policy (OWASP Foundation, 2023).

## References

Mozilla (n.d.-a) ‘Document.cookie’. *MDN Web Docs*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie (Accessed: 30 September 2026).

Mozilla (n.d.-b) ‘Web Storage API’. *MDN Web Docs*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API (Accessed: 30 September 2026).

OWASP Foundation (2023) ‘HTML5 Security Cheat Sheet’. *OWASP Cheat Sheet Series*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html (Accessed: 30 September 2026).
