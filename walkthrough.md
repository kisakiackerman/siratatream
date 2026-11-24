# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 6

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Server-Side Request Forgery (SSRF) | `server.ts` | 1604–1776, 836–858 | `/api/adhan/stream` and `/api/adhan/download` checked `hostname.endsWith("assabile.com")` without a leading dot (allowing lookalike domains such as `evilassabile.com`), allowed custom ports/credentials, and followed arbitrary HTTP redirects; `/api/subtitles` fetched `captionTracks[0].baseUrl` without host/scheme verification. | High | Fixed | Added `validateAssabileUrl()` (strict `https:`/`http:`, exact `assabile.com` or `.assabile.com`, no credentials/custom ports), `fetchValidatedAssabileMedia()` (`redirect: "manual"` with hop re-validation), and strict `https:` YouTube/GoogleVideo hostname checks with `redirect: "error"` on `/api/subtitles`. |
| Missing Creator Authorization | `server.ts`, `src/middleware/auth.ts`, `src/components/CreatorStudioModal.tsx` | `server.ts:201–328, 621`, `auth.ts:30–53` | Administrative endpoints (`/api/agent/status`, `/api/agent/exported-videos`, `/api/agent/download-export`, `/api/agent/sync-now`, `/api/creator/ai-studio`) were callable without authentication or creator verification. | High | Fixed | Added `requireCreator` middleware verifying Firebase ID tokens (`email_verified === true` and allowlisted creator email), applied it to all five routes, and updated `CreatorStudioModal.tsx` to send `Authorization: Bearer <token>`. |
| Unsafe URI Rendering & Embed Injection (XSS) | `src/lib/safeUrl.ts`, `src/components/VideoSuggestionModal.tsx`, `src/components/CreatorStudioModal.tsx`, `src/components/AdminSuggestions.tsx`, `src/components/AnnouncementBanner.tsx`, `src/components/PlayerModal.tsx`, `src/components/StudioMediaPreview.tsx` | `VideoSuggestionModal.tsx:640–736`, `PlayerModal.tsx:729–769` | Community-submitted URLs and embed snippets were placed directly into `<a href>`, `<video src>`, and `<iframe src>` without protocol validation, permitting `javascript:` or `data:` payloads. | High | Fixed | Created `sanitizeHttpUrl`, `sanitizeEmbedUrl`, and `isValidYouTubeId` in `src/lib/safeUrl.ts`, enforced `https:`/`http:` validation on suggestion submissions and links, restricted iframe embeds to `https:`, and added iframe `sandbox` restrictions on community previews. |
| DOM `innerHTML` Sink | `src/components/TarawihSearch.tsx` | 56–64 | `decodeHtml()` assigned external API title strings to `textarea.innerHTML`. | Medium | Fixed | Replaced `innerHTML` parsing with `new DOMParser().parseFromString(..., "text/html").body.textContent`. |
| Firestore Rules & Public PII Exposure | `firestore.rules`, `src/lib/autonomousAIGuardian.ts`, `src/hooks/useVideoSuggestions.ts` | `firestore.rules:30–248` | `active_sessions` allowed unauthenticated reads/writes containing user emails and full URLs; `video_suggestions` lacked `https?://` URL regex enforcement, key restrictions, and vote bounds; `isCreator()` omitted `email_verified == true`. | High | Fixed | Hardened and deployed `firestore.rules` (default-deny catch-all, verified email requirement, `active_sessions` read restricted to creators, `^https?://.+` and immutable core fields on suggestions, creator escalation blocked on `/users`), masked email PII in `active_sessions`, and stopped storing raw emails in public `video_suggestions`. |
| Malware, Adult Content & CSP/Input Hardening | `src/middleware/security.ts`, `server.ts`, codebase scan | `security.ts:43–95` | Scanned the full codebase and media catalogs for malicious scripts, obfuscated loaders, and adult/gambling content; tightened CSP directives, rate-limiter memory bounds, input sizes, and internal error messages. | Medium | Fixed | Confirmed zero malware/obfuscated loaders and zero adult/gambling media (educational addiction-prevention titles only); added `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` CSP rules, input bounds, and generic 500 error messages. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| API Keys & Secrets | `.env.example`, `server.ts`, `src/db/mongodb.ts` | Server secrets (`GEMINI_API_KEY`, `MONGODB_URI`, PostgreSQL credentials) are loaded solely from server-side `process.env` and never bundled into client assets or exposed in API responses. |
| Input Sanitization & Rate Limiting | `src/middleware/security.ts` | All `/api/*` endpoints enforce JSON body limits (`2mb`), prototype-pollution/null-byte/`<script>` sanitization, sliding-window IP rate limits, and hardened HTTP security headers (`HSTS`, `X-Content-Type-Options`, `CSP`, `COOP`). |
| Firebase & PostgreSQL Queries | `src/lib/firebase-admin.ts`, `src/db/locations.ts`, `src/db/users.ts` | Server endpoints verify Firebase ID tokens with `verifyIdToken()`, derive caller identity from the verified token (`req.user.uid`), and use parameterized Drizzle/PostgreSQL queries. |
| Malware & Content Hygiene | `src/`, `public/`, `scripts/`, `index.html` | Codebase audit confirmed zero `eval`, `new Function`, `child_process`, obfuscated `fromCharCode`/`atob` payloads, external tracker scripts, or adult/gambling media content. |

---

## PoC Verification

### 1. SSRF Hostname-Suffix & Redirect Bypass on Audio Proxy

#### Summary
| Field | Value |
|---|---|
| Issue Type | Server-Side Request Forgery (SSRF) |
| Impact | High |
| Affected File | `server.ts:1604-1776` |
| Test Scenario | `GET /api/adhan/stream?url=https://evilassabile.com/audio.mp3` and `GET /api/adhan/stream?url=http://169.254.169.254/latest/meta-data/` |

#### How It Was Fixed
Replaced naive `parsed.hostname.endsWith("assabile.com")` and auto-following `fetch()` calls with `validateAssabileUrl()` (requiring exact `assabile.com` or `.assabile.com` with a leading dot, `https:`/`http:` only, no credentials/custom ports) and `fetchValidatedAssabileMedia()` using `redirect: "manual"` with hop re-validation.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request hits `app.get("/api/adhan/stream")` with `url=https://evilassabile.com/audio.mp3` | Enters handler at `server.ts:1658` |
| 2 | `validateAssabileUrl(rawUrl)` extracts `hostname = "evilassabile.com"` and checks `hostname === "assabile.com" \|\| hostname.endsWith(".assabile.com")` | Evaluates `false`, returns `null` at `server.ts:1619` |
| 3 | Route returns `403` JSON `{ error: "Only assabile.com audio is permitted" }` before any outbound network request occurs | **Handled Safely** |

#### Conclusion
**Fix Verified** - Lookalike domains (`evilassabile.com`), metadata IPs (`169.254.169.254`), and off-domain HTTP redirects can no longer trigger outbound server requests from the audio proxy endpoints.

---

### 2. Unauthenticated Access to Creator Agent & AI Studio Endpoints

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Authentication & Role Authorization |
| Impact | High |
| Affected File | `server.ts:201-328, 621` & `src/middleware/auth.ts:30-53` |
| Test Scenario | `POST /api/agent/sync-now` and `POST /api/creator/ai-studio` sent without an `Authorization: Bearer <token>` header or with a standard non-creator user token |

#### How It Was Fixed
Implemented `requireCreator` middleware in `src/middleware/auth.ts` verifying the Firebase ID token via `adminAuth.verifyIdToken()`, requiring `email_verified === true` and matching `KNOWN_CREATOR_EMAILS`, and applied it to all `/api/agent/*` and `/api/creator/ai-studio` routes while updating `CreatorStudioModal.tsx` to supply the Firebase ID token.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Unauthenticated `POST /api/agent/sync-now` arrives without `Authorization` header | Hits `requireCreator` at `server.ts:318` |
| 2 | `requireCreator` checks `authHeader.startsWith('Bearer ')` (`src/middleware/auth.ts:35`), or verifies email claim & `email_verified` (`src/middleware/auth.ts:44`) | Missing token returns `401`; non-creator verified user returns `403` |
| 3 | Request is rejected before `dailyChannelSyncAgent.runSilentSync()` or Gemini generation runs | **Handled Safely** |

#### Conclusion
**Fix Verified** - Only signed-in users with a verified creator email token can inspect agent status, export agent files, trigger channel sync, or call Creator AI Studio generation.

---

### 3. Stored `javascript:` URI XSS in Community Video Suggestions & Previews

#### Summary
| Field | Value |
|---|---|
| Issue Type | Stored Cross-Site Scripting via Unsafe URI |
| Impact | High |
| Affected File | `src/components/VideoSuggestionModal.tsx:84, 637-736` & `firestore.rules:114-120, 210-235` |
| Test Scenario | Submitting or reading a suggestion with `url: "javascript:alert(document.domain)"` |

#### How It Was Fixed
Added `sanitizeHttpUrl()` and `sanitizeEmbedUrl()` in `src/lib/safeUrl.ts` across submission handlers, anchor `href` attributes, `<video>`/`<iframe>` preview components, and enforced `data.url.matches('^https?://.+')` in deployed `firestore.rules`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Malicious payload `javascript:alert(document.domain)` submitted to suggestion form or fetched from document | Parsed by `sanitizeHttpUrl()` (`src/lib/safeUrl.ts:37`) and checked by `firestore.rules:118` |
| 2 | URL parser sees `parsed.protocol === "javascript:"` (neither `http:` nor `https:`); Firestore rule rejects non-`^https?://.+` string | Client returns `""` and hides clickable link/player; Firestore rejects write with `PERMISSION_DENIED` |
| 3 | Browser never navigates to or executes `javascript:` script | **Handled Safely** |

#### Conclusion
**Fix Verified** - Both the browser rendering layer and Firestore database boundary strictly allow only valid HTTP/HTTPS URLs.

---

### 4. Unauthenticated Read/Overwrite of `active_sessions` & Suggestion Field Tampering in Firestore

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Database Access Control & PII Exposure |
| Impact | High |
| Affected File | `firestore.rules:186-236` & `src/lib/autonomousAIGuardian.ts:822-842` |
| Test Scenario | Unauthenticated `getDocs(collection(db, "active_sessions"))` or forged `updateDoc` changing `status` / `title` / `voteCount: 999999` on `video_suggestions` |

#### How It Was Fixed
Restricted `active_sessions` reads and deletes strictly to verified creators (`isCreator()` requiring `email_verified == true`), masked stored email identifiers and query parameters client-side, prevented guests from overwriting authenticated sessions, and constrained non-creator `video_suggestions` updates via `affectedKeys().hasOnly(['voteCount', 'voters', 'updatedAt'])` and `±1` vote delta bounds.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Unauthenticated client queries `/active_sessions` or submits `voteCount: 999999` on `/video_suggestions/{id}` | Evaluated by `firestore.rules:187` and `firestore.rules:220-233` |
| 2 | `isCreator()` returns `false` for `active_sessions` read; `incoming().voteCount - existing().voteCount <= 1` fails on tampered vote | Firestore rejects both operations with `PERMISSION_DENIED` |
| 3 | Visitor emails, session URLs, and suggestion metadata remain protected | **Handled Safely** |

#### Conclusion
**Fix Verified** - Deployed Firestore security rules enforce strict creator-only reads on session diagnostics and prevent unauthenticated or privilege-escalated database mutations.
